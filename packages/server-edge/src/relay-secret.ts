/**
 * Resolve relay signing credentials without accepting a shared development
 * fallback in production. ADMIN_PIN remains a legacy migration source.
 */
export function resolveRelaySecret(env: Record<string, unknown> | undefined): string | null {
  const configured = env?.AUTH_SECRET || env?.RELAY_SECRET || env?.ADMIN_PIN;
  if (typeof configured === 'string' && configured.trim().length >= 16) {
    return configured;
  }

  const runtime = String(env?.ENVIRONMENT || env?.NODE_ENV || '').toLowerCase();
  if (runtime === 'production') return null;

  return 'aetheris-sovereign-relay-secret';
}
