/**
 * AETHERIS HYBRID SUITE - MODULAR ASYNC STATE MACHINE
 * Deterministic, strongly-typed Finite State Machine engine for critical asynchronous workflows
 * (WebAuthn hardware auth, WebRTC signaling & chunk streaming, Merkle offline sync, Vault enclaves).
 */

export type StateGuard<TContext, TEventPayload = unknown> = (
  context: TContext,
  payload?: TEventPayload
) => boolean | Promise<boolean>;

export type StateAction<TContext, TEventPayload = unknown> = (
  context: TContext,
  payload?: TEventPayload
) => void | Promise<void>;

export interface StateTransition<TState extends string, TContext, TEventPayload = unknown> {
  target: TState;
  guard?: StateGuard<TContext, TEventPayload>;
  action?: StateAction<TContext, TEventPayload>;
}

export interface StateNode<TState extends string, TEvent extends string, TContext> {
  on?: {
    [K in TEvent]?: TState | StateTransition<TState, TContext, any>;
  };
  onEnter?: StateAction<TContext, any>;
  onExit?: StateAction<TContext, any>;
}

export interface StateMachineConfig<
  TState extends string,
  TEvent extends string,
  TContext extends Record<string, any>
> {
  id?: string;
  initial: TState;
  context: TContext;
  states: {
    [K in TState]: StateNode<TState, TEvent, TContext>;
  };
}

export type StateListener<TState extends string, TContext> = (
  currentState: TState,
  context: Readonly<TContext>,
  event: string,
  payload?: unknown
) => void;

export class StateMachine<
  TState extends string,
  TEvent extends string,
  TContext extends Record<string, any>
> {
  public readonly id: string;
  private _state: TState;
  private _context: TContext;
  private _initialState: TState;
  private _initialContext: TContext;
  private _config: StateMachineConfig<TState, TEvent, TContext>;
  private _listeners: StateListener<TState, TContext>[] = [];
  private _transitionMap = new Map<string, Array<() => void>>();

  constructor(config: StateMachineConfig<TState, TEvent, TContext>) {
    this.id = config.id || 'anonymous-fsm';
    this._config = config;
    this._state = config.initial;
    this._context = { ...config.context };
    this._initialState = config.initial;
    this._initialContext = { ...config.context };
  }

  /**
   * Current active state.
   */
  public getState(): TState {
    return this._state;
  }

  /**
   * Current contextual data.
   */
  public getContext(): Readonly<TContext> {
    return this._context;
  }

  /**
   * Mutate context safely.
   */
  public updateContext(updater: (current: TContext) => Partial<TContext> | void): void {
    const patch = updater(this._context);
    if (patch) {
      this._context = { ...this._context, ...patch };
    }
  }

  /**
   * Checks if an event can be transitioned from current state without executing it.
   */
  public async can<TPayload = unknown>(event: TEvent, payload?: TPayload): Promise<boolean> {
    const currentStateNode = this._config.states[this._state];
    if (!currentStateNode?.on) return false;

    const transition = currentStateNode.on[event];
    if (!transition) return false;

    if (typeof transition === 'string') return true;

    if (transition.guard) {
      try {
        return Boolean(await transition.guard(this._context, payload));
      } catch {
        return false;
      }
    }

    return true;
  }

  /**
   * Synchronous check for transition availability (ignoring async guards).
   */
  public canSync(event: TEvent): boolean {
    const currentStateNode = this._config.states[this._state];
    return Boolean(currentStateNode?.on && currentStateNode.on[event]);
  }

  /**
   * Dispatch an event to transition the state machine.
   * Returns true if transition succeeded, false if rejected/guarded.
   */
  public async send<TPayload = unknown>(event: TEvent, payload?: TPayload): Promise<boolean> {
    const currentStateNode = this._config.states[this._state];
    if (!currentStateNode?.on) {
      return false;
    }

    const transition = currentStateNode.on[event];
    if (!transition) {
      return false;
    }

    let targetState: TState;
    let guard: StateGuard<TContext, TPayload> | undefined;
    let action: StateAction<TContext, TPayload> | undefined;

    if (typeof transition === 'string') {
      targetState = transition as unknown as TState;
    } else {
      targetState = transition.target;
      guard = transition.guard;
      action = transition.action;
    }

    // Evaluate Guard
    if (guard) {
      const allowed = await guard(this._context, payload);
      if (!allowed) {
        return false;
      }
    }

    const fromState = this._state;
    const toState = targetState;
    const targetStateNode = this._config.states[toState];

    // Execute Exit Action of current state
    if (currentStateNode.onExit) {
      await currentStateNode.onExit(this._context, payload);
    }

    // Execute Transition Action
    if (action) {
      await action(this._context, payload);
    }

    // Update active state
    this._state = toState;

    // Execute Enter Action of target state
    if (targetStateNode?.onEnter) {
      await targetStateNode.onEnter(this._context, payload);
    }

    // Notify Global Listeners
    this._notifyListeners(toState, event, payload);

    // Notify Specific Transition Listeners
    const transitionKey = `${fromState}->${toState}`;
    const specificListeners = this._transitionMap.get(transitionKey);
    if (specificListeners) {
      for (const cb of specificListeners) {
        try {
          cb();
        } catch (e) {
          console.error(`[StateMachine:${this.id}] Transition hook error:`, e);
        }
      }
    }

    return true;
  }

  /**
   * Subscribe to state transition events.
   */
  public subscribe(listener: StateListener<TState, TContext>): () => void {
    this._listeners.push(listener);
    return () => {
      this._listeners = this._listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Register a specific from->to transition callback.
   */
  public onTransition(from: TState, to: TState, callback: () => void): () => void {
    const key = `${from}->${to}`;
    const list = this._transitionMap.get(key) || [];
    list.push(callback);
    this._transitionMap.set(key, list);

    return () => {
      const updated = (this._transitionMap.get(key) || []).filter((cb) => cb !== callback);
      this._transitionMap.set(key, updated);
    };
  }

  /**
   * Reset the state machine back to its initial state and context.
   */
  public reset(): void {
    this._state = this._initialState;
    this._context = { ...this._initialContext };
  }

  private _notifyListeners(state: TState, event: string, payload?: unknown): void {
    for (const listener of this._listeners) {
      try {
        listener(state, this._context, event, payload);
      } catch (err) {
        console.error(`[StateMachine:${this.id}] Listener error:`, err);
      }
    }
  }
}
