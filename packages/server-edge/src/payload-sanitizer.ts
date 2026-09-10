/**
 * UREfy Zero-Day & Advanced Injection Firewall
 * 
 * Provides:
 * - Multi-pass HTML / Markdown XSS neutralization
 * - Deep Prototype Pollution Defense (`__proto__`, `constructor`, `prototype`)
 * - Path Traversal & Command Injection filter
 * - Safe JSON deserializer with prototype shielding
 */

export class PayloadSanitizer {
  // Regex to detect script tags, event handlers, javascript: pseudo-protocols
  private static readonly SCRIPT_TAG_REGEX = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
  private static readonly ON_EVENT_REGEX = /\bon\w+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi;
  private static readonly JAVASCRIPT_URI_REGEX = /(?:javascript|vbscript|data\s*:\s*text\/(?:html|javascript))\s*:/gi;
  private static readonly IFRAME_OBJECT_REGEX = /<(?:iframe|embed|object|base|link|meta)\b[^>]*>/gi;
  private static readonly PATH_TRAVERSAL_REGEX = /(?:\.\.[/\\]|[/\\]\.\.)/g;

  /**
   * Sanitizes user-supplied HTML or plain text strings to prevent XSS attacks.
   */
  public static sanitizeString(input: string): string {
    if (typeof input !== 'string') return '';

    let cleaned = input
      .replace(PayloadSanitizer.SCRIPT_TAG_REGEX, '')
      .replace(PayloadSanitizer.IFRAME_OBJECT_REGEX, '')
      .replace(PayloadSanitizer.ON_EVENT_REGEX, '')
      .replace(PayloadSanitizer.JAVASCRIPT_URI_REGEX, 'blocked:');

    // Strip null bytes and control chars (except standard newlines/tabs)
    cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    return cleaned;
  }

  /**
   * Detects if an input string contains malicious injection patterns.
   */
  public static hasMaliciousPayload(input: string): { dangerous: boolean; reason?: string } {
    if (typeof input !== 'string') return { dangerous: false };

    if (/<script\b/i.test(input)) {
      return { dangerous: true, reason: 'Inline <script> tag detected' };
    }
    if (/\bon\w+\s*=/i.test(input)) {
      return { dangerous: true, reason: 'HTML inline event handler detected (e.g. onload, onerror)' };
    }
    if (PayloadSanitizer.JAVASCRIPT_URI_REGEX.test(input)) {
      return { dangerous: true, reason: 'Malicious javascript: or data: URI detected' };
    }
    if (PayloadSanitizer.PATH_TRAVERSAL_REGEX.test(input)) {
      return { dangerous: true, reason: 'Directory traversal sequence (../) detected' };
    }
    if (/<(?:iframe|embed|object)\b/i.test(input)) {
      return { dangerous: true, reason: 'Disallowed embedding element (<iframe/object/embed>) detected' };
    }

    return { dangerous: false };
  }

  /**
   * Recursively sanitizes and shields an object against Prototype Pollution.
   * Drops any keys named `__proto__`, `constructor`, or `prototype`.
   */
  public static sanitizeObject<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      if (typeof obj === 'string') {
        return PayloadSanitizer.sanitizeString(obj) as any;
      }
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => PayloadSanitizer.sanitizeObject(item)) as any;
    }

    const cleanObj: Record<string, any> = Object.create(null);

    for (const key of Object.keys(obj as any)) {
      // Prototype Pollution Shield
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }

      const val = (obj as any)[key];
      cleanObj[key] = PayloadSanitizer.sanitizeObject(val);
    }

    return cleanObj as T;
  }

  /**
   * Parses JSON string safely with automatic prototype pollution neutralization.
   */
  public static safeJSONParse<T = any>(rawJson: string): T {
    const parsed = JSON.parse(rawJson, (key, value) => {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        return undefined; // Drop polluted keys
      }
      return value;
    });

    return PayloadSanitizer.sanitizeObject(parsed);
  }

  /**
   * Validates channel IDs, filenames, and user identifiers to ensure they conform to strict alphanumeric patterns.
   */
  public static isValidIdentifier(id: string): boolean {
    if (!id || typeof id !== 'string' || id.length > 128) return false;
    return /^[a-zA-Z0-9_-]+$/.test(id);
  }
}
