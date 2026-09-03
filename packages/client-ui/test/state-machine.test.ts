import { describe, it, expect, vi } from 'vitest';
import { StateMachine } from '../src/state-machine.js';

type AuthState = 'idle' | 'prompting' | 'verifying' | 'authenticated' | 'error';
type AuthEvent = 'START' | 'SUBMIT_BIOMETRICS' | 'SUCCESS' | 'FAIL' | 'RESET';

interface AuthContext {
  userId: string | null;
  attempts: number;
  lastError: string | null;
}

describe('StateMachine (Deterministic Async FSM)', () => {
  function createAuthFSM() {
    return new StateMachine<AuthState, AuthEvent, AuthContext>({
      id: 'auth-fsm',
      initial: 'idle',
      context: {
        userId: null,
        attempts: 0,
        lastError: null,
      },
      states: {
        idle: {
          on: {
            START: 'prompting',
          },
        },
        prompting: {
          on: {
            SUBMIT_BIOMETRICS: {
              target: 'verifying',
              guard: (_ctx, payload: { passkey: string }) => Boolean(payload?.passkey && payload.passkey.length > 3),
              action: (ctx) => {
                ctx.attempts += 1;
              },
            },
            FAIL: 'error',
          },
        },
        verifying: {
          on: {
            SUCCESS: {
              target: 'authenticated',
              action: (ctx, payload: { userId: string }) => {
                ctx.userId = payload.userId;
              },
            },
            FAIL: {
              target: 'error',
              action: (ctx, payload: { error: string }) => {
                ctx.lastError = payload?.error || 'Auth failure';
              },
            },
          },
        },
        authenticated: {
          on: {
            RESET: 'idle',
          },
        },
        error: {
          on: {
            RESET: 'idle',
            START: 'prompting',
          },
        },
      },
    });
  }

  it('should initialize with starting state and context', () => {
    const fsm = createAuthFSM();
    expect(fsm.getState()).toBe('idle');
    expect(fsm.getContext().userId).toBeNull();
    expect(fsm.getContext().attempts).toBe(0);
  });

  it('should transition correctly on valid events', async () => {
    const fsm = createAuthFSM();

    const allowed = await fsm.send('START');
    expect(allowed).toBe(true);
    expect(fsm.getState()).toBe('prompting');

    const nextAllowed = await fsm.send('SUBMIT_BIOMETRICS', { passkey: 'secure_fido_key' });
    expect(nextAllowed).toBe(true);
    expect(fsm.getState()).toBe('verifying');
    expect(fsm.getContext().attempts).toBe(1);

    const successAllowed = await fsm.send('SUCCESS', { userId: 'sovereign_0x99' });
    expect(successAllowed).toBe(true);
    expect(fsm.getState()).toBe('authenticated');
    expect(fsm.getContext().userId).toBe('sovereign_0x99');
  });

  it('should reject transitions blocked by guard predicates', async () => {
    const fsm = createAuthFSM();
    await fsm.send('START');

    // Invalid passkey should be rejected by guard
    const invalidAllowed = await fsm.send('SUBMIT_BIOMETRICS', { passkey: '1' });
    expect(invalidAllowed).toBe(false);
    expect(fsm.getState()).toBe('prompting'); // state does not change
  });

  it('should reject invalid events not defined in current state', async () => {
    const fsm = createAuthFSM();
    const result = await fsm.send('SUCCESS', { userId: 'fake' });
    expect(result).toBe(false);
    expect(fsm.getState()).toBe('idle');
  });

  it('should notify subscribers on state transitions', async () => {
    const fsm = createAuthFSM();
    const subscriber = vi.fn();
    const unsub = fsm.subscribe(subscriber);

    await fsm.send('START');
    expect(subscriber).toHaveBeenCalledWith('prompting', expect.anything(), 'START', undefined);

    unsub();
    await fsm.send('SUBMIT_BIOMETRICS', { passkey: 'passkey123' });
    expect(subscriber).toHaveBeenCalledTimes(1);
  });

  it('should invoke onTransition hook for specific state changes', async () => {
    const fsm = createAuthFSM();
    const hook = vi.fn();
    fsm.onTransition('prompting', 'verifying', hook);

    await fsm.send('START');
    expect(hook).not.toHaveBeenCalled();

    await fsm.send('SUBMIT_BIOMETRICS', { passkey: 'valid_key' });
    expect(hook).toHaveBeenCalledTimes(1);
  });

  it('should reset back to initial state and context', async () => {
    const fsm = createAuthFSM();
    await fsm.send('START');
    await fsm.send('SUBMIT_BIOMETRICS', { passkey: 'valid_key' });
    await fsm.send('SUCCESS', { userId: 'sovereign_user' });

    expect(fsm.getState()).toBe('authenticated');
    fsm.reset();
    expect(fsm.getState()).toBe('idle');
    expect(fsm.getContext().userId).toBeNull();
    expect(fsm.getContext().attempts).toBe(0);
  });
});
