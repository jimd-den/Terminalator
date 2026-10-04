/**
 * Locale helpers (XBD ch. 7/8): LC_ALL overrides LC_CTYPE overrides LANG.
 */
export function ctypeLocale(env: Record<string, string>): string {
    return env.LC_ALL || env.LC_CTYPE || env.LANG || 'C';
}

/** Whether characters are multi-byte UTF-8 (otherwise one byte = one char). */
export function isUtf8Locale(env: Record<string, string>): boolean {
    return /utf-?8/i.test(ctypeLocale(env));
}
