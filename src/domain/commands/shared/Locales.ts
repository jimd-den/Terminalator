/**
 * Locales on the simulated system (XBD ch. 7/8): the built-in C/POSIX and
 * C.UTF-8 locales plus compiled locales under /usr/lib/locale (or LOCPATH),
 * one `keyword=value` file per category as written by localedef.
 */
import { ProcessContext } from '../../entities/ProcessContext';
import { statPath } from './FileInfo';
import { DirectoryNode } from '../../entities/filesystem/DirectoryNode';
import { isBuiltinLocale, normalizeLocaleName } from '../../utils/i18n/LocaleName';
import { builtinTables, KeywordTable, LocaleCategory, LOCALE_CATEGORIES, parseCategory } from '../../utils/i18n/LocaleDefinition';

export const LOCALE_DIR = '/usr/lib/locale';
export const I18N_DIR = '/usr/share/i18n';

/** Path of a category's data inside a compiled locale directory. */
export function categoryFile(dir: string, cat: LocaleCategory): string {
    return cat === 'LC_MESSAGES' ? `${dir}/LC_MESSAGES/SYS_LC_MESSAGES` : `${dir}/${cat}`;
}

/** The locale a category uses: LC_ALL, then LC_<category>, then LANG, else C. */
export function effectiveLocale(env: Record<string, string>, cat: LocaleCategory): string {
    return env.LC_ALL || env[cat] || env.LANG || 'C';
}

/** Entry names of a directory (empty when it does not exist). */
export function listDirectory(context: ProcessContext, path: string): string[] {
    try {
        const node = context.fileSystemService.resolve(path, '/');
        return node instanceof DirectoryNode ? [...node.children.keys()].filter(n => n !== '.' && n !== '..') : [];
    } catch {
        return [];
    }
}

export function readText(context: ProcessContext, path: string): string | null {
    const info = statPath(context, path);
    if (!info || info.kind !== 'regular') return null;
    try {
        return context.fileSystemService.readFile(info.path, '/', context.user);
    } catch {
        return null;
    }
}

/** The directory holding locale `name`, or null when it is not installed. */
export function localeDirectory(context: ProcessContext, name: string): string | null {
    if (!name || name === '.' || name === '..') return null;
    const isDir = (p: string) => statPath(context, p)?.kind === 'directory';
    if (name.includes('/')) return isDir(name) ? context.fileSystemService.resolveAbsolutePath(name, context.cwd) : null;
    const dirs = [...(context.env.LOCPATH ?? '').split(':').filter(Boolean), LOCALE_DIR];
    for (const dir of dirs) {
        for (const candidate of [name, normalizeLocaleName(name)]) {
            const path = `${dir.replace(/\/$/, '')}/${candidate}`;
            if (isDir(path)) return path;
        }
    }
    return null;
}

/** Keyword table of one category of a locale; null when the locale or category is missing. */
export function loadCategory(context: ProcessContext, name: string, cat: LocaleCategory): [string, string][] | null {
    const builtin = isBuiltinLocale(name);
    if (builtin) return builtinTables(builtin)[cat];
    const dir = localeDirectory(context, name);
    if (!dir) return null;
    const text = readText(context, categoryFile(dir, cat));
    return text === null ? null : parseCategory(text);
}

/** Whether setlocale(cat, name) would succeed. */
export function localeAvailable(context: ProcessContext, name: string, cat: LocaleCategory): boolean {
    return loadCategory(context, name, cat) !== null;
}

/** The tables in effect for this process: each category from its locale, C when that is unavailable. */
export function currentTables(context: ProcessContext): KeywordTable {
    const c = builtinTables('C');
    const out = {} as KeywordTable;
    const allOk = !context.env.LC_ALL || LOCALE_CATEGORIES.every(cat => localeAvailable(context, context.env.LC_ALL, cat));
    for (const cat of LOCALE_CATEGORIES) {
        out[cat] = (allOk ? loadCategory(context, effectiveLocale(context.env, cat), cat) : null) ?? c[cat];
    }
    return out;
}

/** Names listed by `locale -a`: C, POSIX, C.utf8 and every compiled locale directory. */
export function installedLocales(context: ProcessContext): string[] {
    const names = new Set(['C', 'C.utf8', 'POSIX']);
    for (const entry of listDirectory(context, LOCALE_DIR)) {
        if (statPath(context, `${LOCALE_DIR}/${entry}/LC_IDENTIFICATION`)) names.add(entry);
    }
    return [...names].sort((a, b) => {
        const x = a.toLowerCase(), y = b.toLowerCase();
        return x < y ? -1 : x > y ? 1 : 0;
    });
}

/** Charmap names in /usr/share/i18n/charmaps (`locale -m`). */
export function installedCharmaps(context: ProcessContext): string[] {
    return listDirectory(context, `${I18N_DIR}/charmaps`).map(n => n.replace(/\.gz$/, '')).sort();
}
