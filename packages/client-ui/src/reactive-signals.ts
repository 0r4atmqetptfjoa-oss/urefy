interface Subscriber {
  (): void;
  deps?: Set<Set<Subscriber>>;
}

let activeEffect: Subscriber | null = null;
let batchDepth = 0;
const pendingEffects = new Set<Subscriber>();

function cleanupEffectDependencies(runner: Subscriber): void {
  if (!runner.deps) return;
  for (const depSet of runner.deps) {
    depSet.delete(runner);
  }
  runner.deps.clear();
}

function flushPendingEffects(): void {
  if (batchDepth > 0) return;
  let iterations = 0;
  while (pendingEffects.size > 0 && iterations < 100) {
    iterations++;
    const queue = Array.from(pendingEffects);
    pendingEffects.clear();
    for (const runner of queue) {
      runner();
    }
  }
}

export class Signal<T> {
  private _value: T;
  private subscribers = new Set<Subscriber>();

  constructor(initialValue: T) {
    this._value = initialValue;
  }

  public get value(): T {
    if (activeEffect) {
      this.subscribers.add(activeEffect);
      if (!activeEffect.deps) {
        activeEffect.deps = new Set();
      }
      activeEffect.deps.add(this.subscribers);
    }
    return this._value;
  }

  public set value(nextValue: T) {
    if (Object.is(this._value, nextValue)) return;
    this._value = nextValue;
    this.notify();
  }

  public peek(): T {
    return this._value;
  }

  public update(updater: (current: T) => T): void {
    this.value = updater(this._value);
  }

  public subscribe(listener: (val: T) => void, runImmediately = true): () => void {
    const runner: Subscriber = () => listener(this._value);
    this.subscribers.add(runner);
    if (runImmediately) {
      listener(this._value);
    }
    return () => {
      this.subscribers.delete(runner);
      pendingEffects.delete(runner);
    };
  }

  public notify(): void {
    const currentSubscribers = Array.from(this.subscribers);
    for (const sub of currentSubscribers) {
      if (batchDepth > 0) {
        pendingEffects.add(sub);
      } else {
        sub();
      }
    }
  }
}

export class Computed<T> {
  private _signal: Signal<T>;
  private _disposeEffect: () => void;

  constructor(computeFn: () => T) {
    this._signal = new Signal<T>(undefined as unknown as T);
    this._disposeEffect = effect(() => {
      this._signal.value = computeFn();
    });
  }

  public get value(): T {
    return this._signal.value;
  }

  public peek(): T {
    return this._signal.peek();
  }

  public subscribe(listener: (val: T) => void, runImmediately = true): () => void {
    return this._signal.subscribe(listener, runImmediately);
  }

  public dispose(): void {
    this._disposeEffect();
  }
}

export function createSignal<T>(initialValue: T): Signal<T> {
  return new Signal<T>(initialValue);
}

export function createComputed<T>(computeFn: () => T): Computed<T> {
  return new Computed<T>(computeFn);
}

export function effect(fn: () => void | (() => void)): () => void {
  let cleanup: (() => void) | void;
  let disposed = false;

  const runner: Subscriber = () => {
    if (disposed) return;
    if (typeof cleanup === 'function') {
      try {
        cleanup();
      } catch {}
    }
    cleanupEffectDependencies(runner);
    const prevEffect = activeEffect;
    activeEffect = runner;
    try {
      cleanup = fn();
    } finally {
      activeEffect = prevEffect;
    }
  };
  runner.deps = new Set();

  runner();

  return () => {
    disposed = true;
    if (typeof cleanup === 'function') {
      try {
        cleanup();
      } catch {}
    }
    cleanupEffectDependencies(runner);
    pendingEffects.delete(runner);
  };
}

export function batch<T>(fn: () => T): T {
  batchDepth++;
  try {
    return fn();
  } finally {
    batchDepth--;
    if (batchDepth === 0) {
      flushPendingEffects();
    }
  }
}

export function bindSignalText<T>(
  selectorOrElement: string | HTMLElement | null,
  source: Signal<T> | Computed<T>,
  formatter: (val: T) => string = (v) => String(v ?? '')
): () => void {
  return effect(() => {
    if (typeof document === 'undefined') return;
    const el =
      typeof selectorOrElement === 'string'
        ? document.querySelector<HTMLElement>(selectorOrElement)
        : selectorOrElement;
    if (el) {
      const nextText = formatter(source.value);
      if (el.textContent !== nextText) {
        el.textContent = nextText;
      }
    }
  });
}

export function bindSignalAttr<T>(
  selectorOrElement: string | HTMLElement | null,
  attributeName: string,
  source: Signal<T> | Computed<T>,
  formatter: (val: T) => string | null = (v) => (v == null ? null : String(v))
): () => void {
  return effect(() => {
    if (typeof document === 'undefined') return;
    const el =
      typeof selectorOrElement === 'string'
        ? document.querySelector<HTMLElement>(selectorOrElement)
        : selectorOrElement;
    if (!el) return;
    const nextVal = formatter(source.value);
    if (nextVal === null) {
      el.removeAttribute(attributeName);
    } else if (el.getAttribute(attributeName) !== nextVal) {
      el.setAttribute(attributeName, nextVal);
    }
  });
}

export const reactiveTelemetry = {
  pqRatchetEpoch: createSignal<number>(412),
  activeMeshPeers: createSignal<number>(14),
  swarmSpeedBps: createSignal<number>(0),
  spatialAudioActive: createSignal<boolean>(false),
  zkProofStatus: createSignal<'verified' | 'proving' | 'idle'>('verified'),
  edgeLatencyMs: createSignal<number>(12),
};
