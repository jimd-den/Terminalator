/**
 * LocaleName - XPG locale names: language[_territory][.codeset][@modifier].
 *
 * glibc normalises the codeset part when it looks for locale data and
 * message catalogs ("UTF-8" -> "utf8", "ISO-8859-1" -> "iso88591").
 */

export interface LocaleNameParts {
    language: string;
    territory?: string;
    codeset?: string;
    modifier?: string;
}

export function parseLocaleName(name: string): LocaleNameParts {
    const m = /^([^_.@]*)(?:_([^.@]*))?(?:\.([^@]*))?(?:@(.*))?$/.exec(name)!;
    return { language: m[1], territory: m[2], codeset: m[3], modifier: m[4] };
}

/** _nl_normalize_codeset: keep alphanumerics, lower-case; all-digit names get an "iso" prefix. */
export function normalizeCodeset(codeset: string): string {
    const kept = codeset.replace(/[^A-Za-z0-9]/g, '').toLowerCase();
    return /^[0-9]+$/.test(kept) ? 'iso' + kept : kept;
}

/** The name with a normalised codeset (as installed under /usr/lib/locale). */
export function normalizeLocaleName(name: string): string {
    const p = parseLocaleName(name);
    if (p.codeset === undefined) return name;
    return p.language + (p.territory !== undefined ? '_' + p.territory : '') + '.' + normalizeCodeset(p.codeset) +
        (p.modifier !== undefined ? '@' + p.modifier : '');
}

/** The built-in locales every system has (names as accepted by setlocale). */
export function isBuiltinLocale(name: string): 'C' | 'C.UTF-8' | null {
    if (name === 'C' || name === 'POSIX') return 'C';
    if (/^C\.(UTF-8|utf8)$/i.test(name)) return 'C.UTF-8';
    return null;
}

/**
 * Message catalog lookup order for one language entry (gettext's
 * _nl_make_l10nflist): the most specific variant first, dropping
 * modifier, codeset and territory in turn.
 */
export function catalogVariants(name: string): string[] {
    const p = parseLocaleName(name);
    const terr = p.territory !== undefined ? [`_${p.territory}`, ''] : [''];
    const codes = p.codeset !== undefined ? [`.${p.codeset}`, `.${normalizeCodeset(p.codeset)}`, ''] : [''];
    const mods = p.modifier !== undefined ? [`@${p.modifier}`, ''] : [''];
    const out: string[] = [];
    for (const m of mods) for (const t of terr) for (const c of codes) {
        const v = p.language + t + c + m;
        if (!out.includes(v)) out.push(v);
    }
    // gettext tries more specific names first: order by number of parts.
    const weight = (v: string) => (v.includes('@') ? 4 : 0) + (v.includes('_') ? 2 : 0) + (v.includes('.') ? 1 : 0);
    return out.sort((a, b) => weight(b) - weight(a));
}
