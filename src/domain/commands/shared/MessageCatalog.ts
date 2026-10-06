/**
 * Message catalog lookup as done by gettext()/ngettext() (glibc dcigettext):
 *
 * - the LC_MESSAGES locale (LC_ALL, LC_MESSAGES, LANG) must be installed,
 *   and C/POSIX/C.UTF-8 never translate;
 * - otherwise LANGUAGE (a colon-separated priority list) overrides it;
 * - each language is tried from most to least specific variant
 *   (ll_CC.codeset@mod ... ll) as <dir>/<variant>/LC_MESSAGES/<domain>.mo,
 *   where <dir> is TEXTDOMAINDIR or /usr/share/locale;
 * - plural forms are chosen with the catalog's Plural-Forms expression.
 */
import { ProcessContext } from '../../entities/ProcessContext';
import { statPath } from './FileInfo';
import { effectiveLocale, localeAvailable } from './Locales';
import { catalogVariants, isBuiltinLocale } from '../../utils/i18n/LocaleName';
import { MoCatalog, parseMo } from '../../utils/i18n/MoFile';
import { CIntExpr, CExprError } from '../../utils/CIntExpr';
import { headerField } from '../../utils/i18n/PoFile';

export const DEFAULT_LOCALEDIR = '/usr/share/locale';

/** Plural form index for count `n` per a catalog header (default: n != 1). */
export function pluralIndex(header: string | undefined, n: bigint): number {
    const spec = header ? headerField(header, 'Plural-Forms') : undefined;
    const plural = spec && /plural\s*=\s*([^;]*)/.exec(spec)?.[1];
    const nplurals = Number(spec && /nplurals\s*=\s*(\d+)/.exec(spec)?.[1] || 2);
    if (!plural) return n === 1n ? 0 : 1;
    try {
        const v = CIntExpr.compile(plural, { bits: 64, signed: false, ternary: true, variables: ['n'] }).evaluate({ n });
        return v < BigInt(nplurals) ? Number(v) : 0;
    } catch (e) {
        if (e instanceof CExprError) return n === 1n ? 0 : 1;
        throw e;
    }
}

/** The languages to search, or [] when messages are not translated. */
export function messageLanguages(context: ProcessContext): string[] {
    let locale = effectiveLocale(context.env, 'LC_MESSAGES');
    if (!localeAvailable(context, locale, 'LC_MESSAGES')) locale = 'C';
    if (isBuiltinLocale(locale)) return [];
    const list = context.env.LANGUAGE ? context.env.LANGUAGE.split(':').filter(Boolean) : [locale];
    const stop = list.findIndex(l => l === 'C' || l === 'POSIX');
    return stop === -1 ? list : list.slice(0, stop);
}

function loadCatalog(context: ProcessContext, path: string): MoCatalog | null {
    const info = statPath(context, path);
    if (!info || info.kind !== 'regular') return null;
    try {
        return parseMo(context.fileSystemService.readFileBuffer(info.path, '/', context.user));
    } catch {
        return null;
    }
}

/**
 * Translates `msgid` (with optional context and plural) in `domain`.
 * Returns null when no catalog has it, so the caller can fall back.
 */
export function translate(context: ProcessContext, domain: string, msgid: string,
    opts: { context?: string; plural?: { msgidPlural: string; n: bigint } } = {}): string | null {
    if (!domain || !msgid) return null;
    const dir = context.env.TEXTDOMAINDIR || DEFAULT_LOCALEDIR;
    const key = (opts.context !== undefined ? opts.context + '\x04' : '') + msgid;
    for (const lang of messageLanguages(context)) {
        for (const variant of catalogVariants(lang)) {
            const catalog = loadCatalog(context, `${dir}/${variant}/LC_MESSAGES/${domain}.mo`);
            const found = catalog?.get(key);
            if (found === undefined) continue;
            if (!opts.plural) return found.split('\0')[0];
            const forms = found.split('\0');
            return forms[pluralIndex(catalog!.get(''), opts.plural.n)] ?? forms[0];
        }
    }
    return null;
}
