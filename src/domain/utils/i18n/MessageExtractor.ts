/**
 * MessageExtractor - finds translatable strings in source code the way GNU
 * xgettext does for C/C++ and shell scripts.
 *
 * Keywords are `name[:spec]` where spec lists argument numbers: `1,2` for
 * singular/plural, `1c,2` for context and msgid. Adjacent C string literals
 * are concatenated. Comments directly preceding a keyword line are kept
 * for --add-comments (GNU resets them at each newline once code followed).
 */
import { cUnescape } from './PoFile';

export interface KeywordSpec {
    name: string;
    singular: number;
    plural?: number;
    context?: number;
}

export interface ExtractedMessage {
    msgid: string;
    msgidPlural?: string;
    msgctxt?: string;
    line: number;
    comments: string[];
    /** The keyword marks a shell eval_gettext-style message (sh-format). */
    shFormat?: boolean;
}

export const C_KEYWORDS = ['gettext', 'dgettext:2', 'dcgettext:2', 'ngettext:1,2', 'dngettext:2,3', 'dcngettext:2,3', 'gettext_noop',
    'pgettext:1c,2', 'dpgettext:2c,3', 'dcpgettext:2c,3', 'npgettext:1c,2,3', 'dnpgettext:2c,3,4', 'dcnpgettext:2c,3,4'];
export const SHELL_KEYWORDS = ['gettext', 'ngettext:1,2', 'eval_gettext', 'eval_ngettext:1,2', 'eval_pgettext:1c,2', 'eval_npgettext:1c,2,3'];

export function parseKeyword(spec: string): KeywordSpec | null {
    const [name, args] = spec.split(':', 2);
    if (!name) return null;
    const k: KeywordSpec = { name, singular: 1 };
    if (args) {
        const nums: number[] = [];
        for (const part of args.split(',')) {
            const m = /^(\d+)(c|t)?$/.exec(part.trim());
            if (!m) continue;
            if (m[2] === 'c') k.context = Number(m[1]);
            else if (m[2] !== 't') nums.push(Number(m[1]));
        }
        if (nums[0]) k.singular = nums[0];
        if (nums[1]) k.plural = nums[1];
    }
    return k;
}

// ---- C ------------------------------------------------------------------------

type CToken = { t: 'ident' | 'string' | 'punct'; v: string; line: number; comments: string[] };

/** Strips comment markers the way xgettext stores translator comments. */
function commentLines(text: string): string[] {
    const lines = text.split('\n').map(l => l.replace(/^\s*\*?\s?/, '').replace(/\s+$/, ''));
    while (lines.length && lines[0] === '') lines.shift();
    while (lines.length && lines[lines.length - 1] === '') lines.pop();
    return lines;
}

/**
 * Tokenises C source. Each token carries the comments in effect before it:
 * GNU xgettext keeps comments until a newline that ends a line containing
 * code after the last comment.
 */
function tokenizeC(src: string): CToken[] {
    const tokens: CToken[] = [];
    let pending: string[] = [];
    let lastCommentLine = -1;
    let lastCodeLine = -1;
    let line = 1;
    let i = 0;
    let lineStart = true;
    const push = (t: 'ident' | 'string' | 'punct', v: string) => {
        tokens.push({ t, v, line, comments: pending });
        lastCodeLine = line;
    };
    const newline = () => {
        if (lastCodeLine > lastCommentLine) pending = [];
        line++;
    };
    while (i < src.length) {
        const c = src[i];
        if (c === '\n') { newline(); i++; lineStart = true; continue; }
        if (c === ' ' || c === '\t' || c === '\r' || c === '\f' || c === '\v') { i++; continue; }
        if (c === '\\' && src[i + 1] === '\n') { i += 2; line++; continue; }
        if (c === '/' && (src[i + 1] === '*' || src[i + 1] === '/')) {
            const block = src[i + 1] === '*';
            const end = block ? src.indexOf('*/', i + 2) : src.indexOf('\n', i);
            const body = src.substring(i + 2, end === -1 ? src.length : end);
            line += (body.match(/\n/g) ?? []).length;
            pending = [...pending, ...commentLines(body)];
            lastCommentLine = line;
            i = end === -1 ? src.length : block ? end + 2 : end;
            continue;
        }
        if (c === '#' && lineStart) {
            // Preprocessor directive: skip to the end of the (continued) line.
            while (i < src.length && src[i] !== '\n') { if (src[i] === '\\' && src[i + 1] === '\n') { i++; line++; } i++; }
            continue;
        }
        lineStart = false;
        if (c === '"' || c === "'") {
            let j = i + 1;
            while (j < src.length && src[j] !== c && src[j] !== '\n') j += src[j] === '\\' ? 2 : 1;
            if (c === '"') push('string', cUnescape(src.substring(i + 1, j)));
            else push('punct', "'");
            i = j + 1;
            continue;
        }
        const id = /^[A-Za-z_][A-Za-z0-9_]*/.exec(src.substring(i, i + 256));
        if (id) {
            // Encoding prefixes of string literals (L"", u8"") belong to the literal.
            if (/^(L|u8|u|U)$/.test(id[0]) && src[i + id[0].length] === '"') { i += id[0].length; continue; }
            push('ident', id[0]);
            i += id[0].length;
            continue;
        }
        push('punct', c);
        i++;
    }
    return tokens;
}

export function extractC(src: string, keywords: KeywordSpec[], commentTag: string | null): ExtractedMessage[] {
    // Adjacent string literals are one string.
    const tokens: CToken[] = [];
    for (const t of tokenizeC(src)) {
        const prev = tokens[tokens.length - 1];
        if (t.t === 'string' && prev?.t === 'string') prev.v += t.v;
        else tokens.push({ ...t });
    }
    const byName = new Map(keywords.map(k => [k.name, k]));
    const out: ExtractedMessage[] = [];
    for (let i = 0; i < tokens.length; i++) {
        const t = tokens[i];
        if (t.t !== 'ident' || !byName.has(t.v) || tokens[i + 1]?.v !== '(') continue;
        const k = byName.get(t.v)!;
        const args: CToken[][] = [[]];
        let depth = 0;
        for (let j = i + 2; j < tokens.length; j++) {
            const a = tokens[j];
            if (a.t === 'punct' && '([{'.includes(a.v)) depth++;
            if (a.t === 'punct' && ')]}'.includes(a.v)) {
                if (depth === 0) break;
                depth--;
            }
            if (a.t === 'punct' && a.v === ',' && depth === 0) { args.push([]); continue; }
            args[args.length - 1].push(a);
        }
        const str = (n?: number) => {
            if (n === undefined) return undefined;
            const arg = args[n - 1];
            return arg && arg.length === 1 && arg[0].t === 'string' ? arg[0].v : null;
        };
        const msgid = str(k.singular);
        const plural = str(k.plural);
        const ctx = str(k.context);
        if (msgid == null || plural === null || ctx === null) continue;
        out.push({ msgid, msgidPlural: plural, msgctxt: ctx, line: t.line, comments: filterTag(t.comments, commentTag) });
    }
    return out;
}

function filterTag(comments: string[], tag: string | null): string[] {
    if (tag === null) return [];
    if (tag === '') return comments;
    const start = comments.findIndex(c => c.startsWith(tag));
    return start === -1 ? [] : comments.slice(start);
}

// ---- Shell -------------------------------------------------------------------

type ShWord = { literal: string | null; line: number; dollarQuoted?: boolean } | { sep: true; line: number };

/** Splits shell source into words (literal value or null when it has expansions) and command separators. */
function tokenizeShell(src: string): ShWord[] {
    const out: ShWord[] = [];
    let i = 0;
    let line = 1;
    const parse = (until: string | null): void => {
        let word: string | null = '';
        let started = false;
        let wordLine = line;
        let dollarQuoted = false;
        const endWord = () => {
            if (started) out.push({ literal: word, line: wordLine, dollarQuoted });
            word = ''; started = false; dollarQuoted = false;
        };
        while (i < src.length) {
            const c = src[i];
            if (until && c === until) { endWord(); i++; out.push({ sep: true, line }); return; }
            if (c === '\n' || c === ';' || c === '|' || c === '&' || c === '(' || c === ')') {
                endWord(); out.push({ sep: true, line });
                if (c === '\n') line++;
                i++; continue;
            }
            if (c === ' ' || c === '\t') { endWord(); i++; continue; }
            if (c === '#' && !started) { while (i < src.length && src[i] !== '\n') i++; continue; }
            if (!started) { started = true; wordLine = line; }
            if (c === '\\') { if (src[i + 1] === '\n') { line++; } else if (word !== null) word += src[i + 1] ?? ''; i += 2; continue; }
            if (c === "'") {
                const end = src.indexOf("'", i + 1);
                const body = src.substring(i + 1, end === -1 ? src.length : end);
                line += (body.match(/\n/g) ?? []).length;
                if (word !== null) word += body;
                i = end === -1 ? src.length : end + 1;
                continue;
            }
            if (c === '"' || (c === '$' && src[i + 1] === '"')) {
                if (c === '$') { dollarQuoted = true; i++; }
                i++;
                while (i < src.length && src[i] !== '"') {
                    const d = src[i];
                    if (d === '\\' && /["\\$`\n]/.test(src[i + 1] ?? '')) { if (src[i + 1] === '\n') line++; else if (word !== null) word += src[i + 1]; i += 2; continue; }
                    if (d === '$' && src[i + 1] === '(') { i += 2; out.push({ sep: true, line }); parse(')'); word = null; continue; }
                    if (d === '`') { i++; out.push({ sep: true, line }); parse('`'); word = null; continue; }
                    if (d === '$' && /[A-Za-z_{0-9@*#?$!-]/.test(src[i + 1] ?? '')) word = null;
                    if (d === '\n') line++;
                    if (word !== null) word += d;
                    i++;
                }
                i++;
                continue;
            }
            if (c === '$' && src[i + 1] === '(') { i += 2; out.push({ sep: true, line }); parse(')'); word = null; continue; }
            if (c === '`') { i++; out.push({ sep: true, line }); parse('`'); word = null; continue; }
            if (c === '$') word = null;
            if (word !== null) word += c;
            i++;
        }
        endWord();
    };
    parse(null);
    return out;
}

export function extractShell(src: string, keywords: KeywordSpec[], warn: (line: number, msg: string) => void): ExtractedMessage[] {
    const words = tokenizeShell(src);
    const byName = new Map(keywords.map(k => [k.name, k]));
    const out: ExtractedMessage[] = [];
    let commandStart = true;
    for (let i = 0; i < words.length; i++) {
        const w = words[i];
        if ('sep' in w) { commandStart = true; continue; }
        if (w.dollarQuoted && w.literal !== null) {
            warn(w.line, 'warning: the syntax $"..." is deprecated due to security reasons; use eval_gettext instead');
            out.push({ msgid: w.literal, line: w.line, comments: [] });
        }
        const atStart = commandStart;
        commandStart = false;
        if (!atStart || w.literal === null || !byName.has(w.literal)) continue;
        const k = byName.get(w.literal)!;
        const args: (string | null)[] = [];
        for (let j = i + 1; j < words.length; j++) {
            const a = words[j];
            if ('sep' in a) break;
            args.push(a.literal);
        }
        const get = (n?: number) => (n === undefined ? undefined : args[n - 1]);
        const msgid = get(k.singular);
        const plural = get(k.plural);
        const ctx = get(k.context);
        if (msgid == null || plural === null || ctx === null) continue;
        out.push({ msgid, msgidPlural: plural, msgctxt: ctx, line: w.line, comments: [], shFormat: k.name.startsWith('eval_') });
    }
    return out;
}

/** GNU's c-format heuristic: every % starts a valid directive (%% included) and there is at least one. */
export function isCFormat(s: string): boolean {
    let directives = 0;
    const re = /%(?:(\d+)\$)?([-+ #0'I]*)(\*(?:\d+\$)?|\d+)?(?:\.(\*(?:\d+\$)?|\d+)?)?(hh|h|ll|l|L|q|j|z|Z|t)?([diouxXeEfFgGaAcsCSpnm%])/y;
    for (let i = 0; i < s.length; i++) {
        if (s[i] !== '%') continue;
        re.lastIndex = i;
        const m = re.exec(s);
        if (!m) return false;
        directives++;
        i = re.lastIndex - 1;
    }
    return directives > 0;
}

/** sh-format: the string references shell variables ($name or ${name}). */
export function isShFormat(s: string): boolean {
    return /\$(?:[A-Za-z_][A-Za-z0-9_]*|\{[A-Za-z_][A-Za-z0-9_]*\})/.test(s);
}
