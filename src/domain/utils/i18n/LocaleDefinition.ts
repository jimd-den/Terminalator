/**
 * LocaleDefinition - compiles POSIX locale definition sources (XBD 7.3, the
 * input of localedef) into keyword tables, and stores/loads compiled
 * categories.
 *
 * Supported source syntax: comment_char / escape_char, line continuation,
 * `LC_x ... END LC_x` sections, `copy "name"`, string values with <Uxxxx>
 * character names, numbers and `;`-separated lists. LC_CTYPE and LC_COLLATE
 * bodies are taken from the generic tables of the charmap's base locale.
 * Derived keywords (codesets, wide characters, crncystr, week-*, duo_*) are
 * computed as glibc does.
 */
import { C_LOCALE, C_UTF8_OVERRIDES, KeywordTable, LOCALE_CATEGORIES, LocaleCategory } from './CLocaleData';

export type { KeywordTable, LocaleCategory } from './CLocaleData';
export { LOCALE_CATEGORIES } from './CLocaleData';

/** Keywords whose list of strings renders as one `;`-joined string. */
const ARRAYS = new Set(['abday', 'day', 'abmon', 'mon', 'am_pm', 'alt_mon', 'ab_alt_mon']);
/** Keywords rendering as a list of separately quoted strings. */
const STRING_LISTS = new Set(['era', 'alt_digits', 'ctype-class-names', 'ctype-map-names']);
/** Categories whose bodies are not modelled (character classes, collation). */
const OPAQUE = new Set<LocaleCategory>(['LC_CTYPE', 'LC_COLLATE']);

const CODESET_KEYWORD: Partial<Record<LocaleCategory, string>> = {
    LC_NUMERIC: 'numeric-codeset', LC_TIME: 'time-codeset', LC_COLLATE: 'collate-codeset', LC_MONETARY: 'monetary-codeset',
    LC_MESSAGES: 'messages-codeset', LC_PAPER: 'paper-codeset', LC_NAME: 'name-codeset', LC_ADDRESS: 'address-codeset',
    LC_TELEPHONE: 'telephone-codeset', LC_MEASUREMENT: 'measurement-codeset', LC_IDENTIFICATION: 'identification-codeset',
};

export function isCategory(name: string): name is LocaleCategory {
    return (LOCALE_CATEGORIES as readonly string[]).includes(name);
}

function cloneTables(t: KeywordTable): KeywordTable {
    const out = {} as KeywordTable;
    for (const c of LOCALE_CATEGORIES) out[c] = t[c].map(([k, v]) => [k, v] as [string, string]);
    return out;
}

function setKeyword(rows: [string, string][], key: string, value: string) {
    const row = rows.find(r => r[0] === key);
    if (row) row[1] = value;
}

/** The tables of the built-in C or C.UTF-8 locale. */
export function builtinTables(kind: 'C' | 'C.UTF-8'): KeywordTable {
    const t = cloneTables(C_LOCALE);
    if (kind === 'C.UTF-8') {
        for (const [cat, rows] of Object.entries(C_UTF8_OVERRIDES) as [LocaleCategory, [string, string][]][]) {
            for (const [k, v] of rows) setKeyword(t[cat], k, v);
        }
    }
    return t;
}

/** Base tables for compiling with a charmap: C.UTF-8 for UTF-8, else C relabelled. */
function baseFor(charmap: string): KeywordTable {
    if (charmap === 'UTF-8') return builtinTables('C.UTF-8');
    const t = builtinTables('C');
    setKeyword(t.LC_CTYPE, 'charmap', `"${charmap}"`);
    for (const c of LOCALE_CATEGORIES) {
        const k = CODESET_KEYWORD[c];
        if (k) setKeyword(t[c], k, `"${charmap}"`);
    }
    setKeyword(t.LC_IDENTIFICATION, 'category', `"i18n:2012;${charmap};;;;;;;;;;;"`);
    return t;
}

type Value = { strings: string[]; numbers: string[]; isString: boolean };

/** Splits one source value (`"a";"b"`, `3;3`, `"x"`) into tokens. */
function parseValue(text: string, escape: string): Value | null {
    const strings: string[] = [];
    const numbers: string[] = [];
    let isString = false;
    let i = 0;
    const esc = escape.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&');
    const token = new RegExp(`<U([0-9A-Fa-f]{4,8})>|${esc}(.)`, 'g');
    const decode = (raw: string) => raw.replace(token, (_m, hex, ch) => (hex ? String.fromCodePoint(parseInt(hex, 16)) : ch));
    while (i < text.length) {
        while (text[i] === ' ' || text[i] === '\t') i++;
        if (i >= text.length) break;
        if (text[i] === '"') {
            let j = i + 1;
            let raw = '';
            while (j < text.length && text[j] !== '"') {
                if (text[j] === escape && j + 1 < text.length) { raw += text[j] + text[j + 1]; j += 2; continue; }
                raw += text[j++];
            }
            if (j >= text.length) return null;
            strings.push(decode(raw));
            isString = true;
            i = j + 1;
        } else {
            const m = /^-?[0-9]+/.exec(text.substring(i));
            if (!m) return null;
            numbers.push(m[0]);
            i += m[0].length;
        }
        while (text[i] === ' ' || text[i] === '\t') i++;
        if (i < text.length) {
            if (text[i] !== ';') return null;
            i++;
        }
    }
    return { strings, numbers, isString };
}

function render(keyword: string, v: Value): string {
    if (!v.isString) return v.numbers.join(';');
    if (ARRAYS.has(keyword)) return `"${v.strings.join(';')}"`;
    if (STRING_LISTS.has(keyword) || v.strings.length > 1) return v.strings.map(s => `"${s}"`).join(';');
    return `"${v.strings[0] ?? ''}"`;
}

export interface CompileResult {
    tables: KeywordTable;
    warnings: string[];
    errors: string[];
}

/** Returns the text of another locale definition source (for `copy`), or null. */
export type SourceResolver = (name: string) => string | null;

interface ParsedSource {
    sections: Map<LocaleCategory, { copy?: string; entries: [string, Value][] }>;
    errors: string[];
}

function parseSource(text: string, file: string): ParsedSource {
    let comment = '#';
    let escape = '\\';
    const sections: ParsedSource['sections'] = new Map();
    const errors: string[] = [];
    const raw = text.split('\n');
    let current: LocaleCategory | null = null;
    for (let n = 0; n < raw.length; n++) {
        let line = raw[n];
        const lineNo = n + 1;
        while (line.endsWith(escape) && n + 1 < raw.length) line = line.slice(0, -1) + raw[++n].replace(/^\s+/, '');
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(comment)) continue;
        const m = /^(\S+)\s*(.*)$/.exec(trimmed)!;
        const [, word, rest] = m;
        if (current === null) {
            if (word === 'comment_char') { comment = rest.trim() || comment; continue; }
            if (word === 'escape_char') { escape = rest.trim() || escape; continue; }
            if (isCategory(word)) { current = word; sections.set(word, { entries: [] }); continue; }
            errors.push(`${file}:${lineNo}: syntax error: not inside a locale category section`);
            continue;
        }
        if (word === 'END') {
            if (rest.trim() !== current) errors.push(`${file}:${lineNo}: ${current}: syntax error`);
            current = null;
            continue;
        }
        const section = sections.get(current)!;
        if (word === 'copy') {
            const v = parseValue(rest, escape);
            if (!v || v.strings.length !== 1) errors.push(`${file}:${lineNo}: ${current}: syntax error`);
            else section.copy = v.strings[0];
            continue;
        }
        if (OPAQUE.has(current)) continue;
        const v = parseValue(rest, escape);
        if (!v) { errors.push(`${file}:${lineNo}: ${current}: syntax error`); continue; }
        section.entries.push([word, v]);
    }
    if (current !== null) errors.push(`${file}: ${current}: unterminated category`);
    return { sections, errors };
}

/** Applies a parsed category body (recursively following `copy`) onto `rows`. */
function applySection(cat: LocaleCategory, source: ParsedSource, rows: [string, string][], resolve: SourceResolver,
    errors: string[], depth = 0): boolean {
    const section = source.sections.get(cat);
    if (!section) return false;
    if (section.copy && !OPAQUE.has(cat) && !['POSIX', 'C'].includes(section.copy)) {
        const text = depth < 8 ? resolve(section.copy) : null;
        if (text === null) { errors.push(`cannot open locale definition file \`${section.copy}'`); return true; }
        applySection(cat, parseSource(text, section.copy), rows, resolve, errors, depth + 1);
    }
    const defined = new Set<string>();
    for (const [key, v] of section.entries) {
        defined.add(key);
        if (key === 'week') {
            const parts = v.numbers;
            ['week-ndays', 'week-1stday', 'week-1stweek'].forEach((k, i) => { if (parts[i] !== undefined) setKeyword(rows, k, parts[i]); });
            continue;
        }
        setKeyword(rows, key, render(key, v));
        if (key.startsWith('duo_') === false && rows.some(r => r[0] === `duo_${key}`)) setKeyword(rows, `duo_${key}`, render(key, v));
    }
    const get = (k: string) => rows.find(r => r[0] === k)?.[1] ?? '';
    const unquote = (s: string) => s.replace(/^"|"$/g, '');
    const wc = (s: string) => String(unquote(s).codePointAt(0) ?? 0);
    if (cat === 'LC_NUMERIC') {
        setKeyword(rows, 'numeric-decimal-point-wc', wc(get('decimal_point')));
        setKeyword(rows, 'numeric-thousands-sep-wc', wc(get('thousands_sep')));
    } else if (cat === 'LC_MONETARY') {
        setKeyword(rows, 'monetary-decimal-point-wc', wc(get('mon_decimal_point')));
        setKeyword(rows, 'monetary-thousands-sep-wc', wc(get('mon_thousands_sep')));
        setKeyword(rows, 'crncystr', `"${get('p_cs_precedes') === '0' ? '+' : '-'}${unquote(get('currency_symbol'))}"`);
    } else if (cat === 'LC_TIME') {
        if (!defined.has('alt_mon')) setKeyword(rows, 'alt_mon', get('mon'));
        if (!defined.has('ab_alt_mon')) setKeyword(rows, 'ab_alt_mon', get('abmon'));
        const era = get('era');
        setKeyword(rows, 'time-era-num-entries', String(era ? era.split('";"').length : 0));
    }
    return true;
}

/** Compiles a locale definition source for a charmap (its code set name). */
export function compileLocale(source: string, file: string, charmap: string, resolve: SourceResolver): CompileResult {
    const tables = baseFor(charmap);
    const parsed = parseSource(source, file);
    const errors = [...parsed.errors];
    const warnings: string[] = [];
    for (const cat of LOCALE_CATEGORIES) {
        if (!applySection(cat, parsed, tables[cat], resolve, errors)) warnings.push(`No definition for ${cat} category found`);
    }
    return { tables, warnings, errors };
}

/** Compiled category file contents: one `keyword=value` line per keyword. */
export function renderCategory(rows: [string, string][]): string {
    return rows.map(([k, v]) => `${k}=${v}\n`).join('');
}

export function parseCategory(text: string): [string, string][] {
    return text.split('\n').filter(l => l.includes('=')).map(l => {
        const i = l.indexOf('=');
        return [l.substring(0, i), l.substring(i + 1)] as [string, string];
    });
}

/** `locale` prints values without -k by dropping the quotes. */
export function plainValue(rendered: string): string {
    return rendered.replace(/"/g, '');
}
