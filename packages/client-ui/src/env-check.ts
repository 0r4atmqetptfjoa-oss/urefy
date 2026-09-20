/**
 * Environment check utilities (Zero Dependency, Lean Startup).
 * Isolated from AdminAuth to avoid pulling admin UI into the startup bundle.
 */

export function isLocalDev(): boolean {
  const isTestRuntime = typeof process !== 'undefined' && process.env?.VITEST === 'true';
  if (!isTestRuntime) return false;
  if (typeof window === 'undefined' || !window.location) return true;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]';
}

export function isProductionBuild(): boolean {
  if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.PROD) {
    return true;
  }
  if (typeof process !== 'undefined' && process.env?.VITEST === 'true') {
    return !isLocalDev();
  }
  if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.DEV) {
    return false;
  }
  return !isLocalDev();
}
