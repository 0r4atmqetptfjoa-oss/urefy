import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ServiceRegistry, createServiceToken, SERVICES, serviceRegistry } from '../src/service-registry.js';

describe('ServiceRegistry & Dependency Injection Container', () => {
  let registry: ServiceRegistry;

  beforeEach(() => {
    registry = new ServiceRegistry();
  });

  it('should register and resolve a direct instance singleton', () => {
    const token = createServiceToken<{ testVal: string }>('TestService');
    const instance = { testVal: 'sovereign_node' };

    registry.registerInstance(token, instance);

    expect(registry.has(token)).toBe(true);
    const resolved = registry.resolve(token);
    expect(resolved).toBe(instance);
    expect(resolved.testVal).toBe('sovereign_node');
  });

  it('should register and lazily resolve a singleton factory only once', () => {
    const token = createServiceToken<{ id: number }>('LazyService');
    let counter = 0;
    const factory = vi.fn(() => ({ id: ++counter }));

    registry.registerSingleton(token, factory);

    expect(factory).not.toHaveBeenCalled();
    const inst1 = registry.resolve(token);
    expect(factory).toHaveBeenCalledTimes(1);
    expect(inst1.id).toBe(1);

    const inst2 = registry.resolve(token);
    expect(factory).toHaveBeenCalledTimes(1);
    expect(inst2).toBe(inst1);
  });

  it('should register and resolve a transient factory fresh every time', () => {
    const token = createServiceToken<{ id: number }>('TransientService');
    let counter = 0;
    registry.registerTransient(token, () => ({ id: ++counter }));

    const inst1 = registry.resolve(token);
    const inst2 = registry.resolve(token);

    expect(inst1.id).toBe(1);
    expect(inst2.id).toBe(2);
    expect(inst1).not.toBe(inst2);
  });

  it('should throw an error when resolving an unregistered token with resolve()', () => {
    const token = createServiceToken<string>('Unregistered');
    expect(() => registry.resolve(token)).toThrow(/Service not found for token/);
  });

  it('should return undefined when resolving an unregistered token with tryResolve()', () => {
    const token = createServiceToken<string>('Unregistered');
    expect(registry.tryResolve(token)).toBeUndefined();
  });

  it('should support hierarchical child registries with scoping and parent fallback', () => {
    const parentToken = createServiceToken<string>('ParentService');
    const childToken = createServiceToken<string>('ChildService');
    const overrideToken = createServiceToken<string>('OverrideService');

    registry.registerInstance(parentToken, 'from_parent');
    registry.registerInstance(overrideToken, 'parent_version');

    const childRegistry = registry.createChildScope();
    childRegistry.registerInstance(childToken, 'from_child');
    childRegistry.registerInstance(overrideToken, 'child_version');

    // Child resolves own and parent services
    expect(childRegistry.resolve(childToken)).toBe('from_child');
    expect(childRegistry.resolve(parentToken)).toBe('from_parent');
    expect(childRegistry.resolve(overrideToken)).toBe('child_version');

    // Parent does not see child services
    expect(registry.resolve(parentToken)).toBe('from_parent');
    expect(registry.resolve(overrideToken)).toBe('parent_version');
    expect(registry.tryResolve(childToken)).toBeUndefined();
  });

  it('should remove and clear registered services properly', () => {
    const token1 = createServiceToken<string>('Service1');
    const token2 = createServiceToken<string>('Service2');

    registry.registerInstance(token1, 'val1');
    registry.registerInstance(token2, 'val2');

    expect(registry.remove(token1)).toBe(true);
    expect(registry.has(token1)).toBe(false);
    expect(registry.has(token2)).toBe(true);

    registry.clear();
    expect(registry.has(token2)).toBe(false);
  });

  it('should fire registration and resolution event listeners', () => {
    const onRegister = vi.fn();
    const onResolve = vi.fn();

    const unsubRegister = registry.onRegistered(onRegister);
    const unsubResolve = registry.onResolved(onResolve);

    const token = createServiceToken<string>('ObservedService');
    registry.registerInstance(token, 'active_data');

    expect(onRegister).toHaveBeenCalledWith('ObservedService', 'active_data');

    registry.resolve(token);
    expect(onResolve).toHaveBeenCalledWith('ObservedService', 'active_data');

    unsubRegister();
    unsubResolve();
  });

  it('should export predefined service tokens', () => {
    expect(SERVICES.ClientStore.description).toBe('ClientStore');
    expect(SERVICES.AdminAuth.description).toBe('AdminAuth');
    expect(SERVICES.WebAuthn.description).toBe('WebAuthn');
    expect(SERVICES.WalletBridge.description).toBe('WalletBridge');
    expect(SERVICES.ThemeEngine.description).toBe('ThemeEngine');
    expect(serviceRegistry).toBeInstanceOf(ServiceRegistry);
  });
});
