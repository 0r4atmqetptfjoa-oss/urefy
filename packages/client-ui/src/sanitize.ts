import { escapeHtml as dryEscapeHtml } from './dry-utils.js';

/**
 * Escapes unsafe HTML characters to prevent XSS.
 */
export function escapeHtml(text: string | null | undefined): string {
  return dryEscapeHtml(text);
}
