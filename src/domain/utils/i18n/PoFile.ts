/**
 * PoFile - GNU gettext PO files: parsing (msgfmt, xgettext -j) and writing
 * (xgettext) with GNU's quoting and line wrapping.
 *
 *   # translator comment      #. extracted comment
 *   #: file:line              #, flags
 *   msgctxt "ctx"  msgid "id"  msgid_plural "ids"  msgstr "s" | msgstr[N] "s"
 */

export interface PoEntry {
    msgctxt?: string;
    msgid: string;
    msgidPlural?: string;
    msgstr: string[];
    flags: string[];
    references: string[];
    comments: string[];
    extracted: string[];
    obsolete: boolean;
    /** Line of the msgid keyword. */
    line: number;
}

export interface PoParseResult {
    entries: PoEntry[];
    errors: string[];
}

const UNESCAPE: Record<string, string> = { n: '\n', t: '\t', r: '\r', a: '\x07', b: '\b', f: '\f', v: '\v', '\\': '\\', '"': '"', '?': '?', "'": "'" };

/** Decodes the body of a C string literal. */
export function cUnescape(s: string): string {
    return s.replace(/\\(x[0-9A-Fa-f]{1,2}|[0-7]{1,3}|.)/g, (_m, e: string) => {
        if (e[0] === 'x' && e.length > 1) return String.fromCharCode(parseInt(e.substring(1), 16));
        if (/^[0-7]/.test(e)) return String.fromCharCode(parseInt(e, 8));
        return UNESCAPE[e] ?? e;
    });
}

/** Encodes a string as the body of a PO string literal. */
export function poEscape(s: string): string {
    return s.replace(/[\\"\n\t\r\x07\b\f\v]/g, c => ({ '\\': '\\\\', '"': '\\"', '\n': '\\n', '\t': '\\t', '\r': '\\r', '\x07': '\\a', '\b': '\\b', '\f': '\\f', '\v': '\\v' } as Record<string, string>)[c]);
}

/** Parses PO text; errors use GNU msgfmt's "file:line: message" wording. */
export function parsePo(text: string, file: string): PoParseResult {
    const entries: PoEntry[] = [];
    const errors: string[] = [];
    const lines = text.split('\n');
    let cur: PoEntry | null = null;
    let pending = { flags: [] as string[], references: [] as string[], comments: [] as string[], extracted: [] as string[] };
    let field: { name: string; index: number } | null = null;
    let sawMsgstr = false;

    const fresh = (line: number, obsolete: boolean): PoEntry => ({ msgid: '', msgstr: [], ...pending, obsolete, line });
    const finish = () => {
        if (cur) {
            if (!sawMsgstr) errors.push(`${file}:${cur.line}: missing \`msgstr' section`);
            else entries.push(cur);
        }
        cur = null;
        field = null;
        sawMsgstr = false;
        pending = { flags: [], references: [], comments: [], extracted: [] };
    };
    const append = (value: string) => {
        if (!cur || !field) return;
        if (field.name === 'msgid') cur.msgid += value;
        else if (field.name === 'msgid_plural') cur.msgidPlural = (cur.msgidPlural ?? '') + value;
        else if (field.name === 'msgctxt') cur.msgctxt = (cur.msgctxt ?? '') + value;
        else cur.msgstr[field.index] = (cur.msgstr[field.index] ?? '') + value;
    };
    const stringAt = (s: string, lineNo: number): string | null => {
        const m = /^"((?:[^"\\]|\\.)*)"\s*$/.exec(s);
        if (!m) { errors.push(`${file}:${lineNo}:${1}: syntax error`); return null; }
        return cUnescape(m[1]);
    };

    for (let i = 0; i < lines.length; i++) {
        const lineNo = i + 1;
        let line = lines[i].replace(/\r$/, '').trim();
        let obsolete = false;
        if (line.startsWith('#~')) { obsolete = true; line = line.substring(2).trim(); if (!line) continue; }
        if (!line) continue;
        if (line.startsWith('#')) {
            if (cur && sawMsgstr) finish();
            if (line.startsWith('#,')) pending.flags.push(...line.substring(2).split(',').map(f => f.trim()).filter(Boolean));
            else if (line.startsWith('#:')) pending.references.push(...line.substring(2).trim().split(/\s+/).filter(Boolean));
            else if (line.startsWith('#.')) pending.extracted.push(line.substring(2).trim());
            else if (!line.startsWith('#|')) pending.comments.push(line.substring(1).replace(/^ /, ''));
            continue;
        }
        if (line.startsWith('"')) {
            if (!field) { errors.push(`${file}:${lineNo}:1: syntax error`); continue; }
            const v = stringAt(line, lineNo);
            if (v !== null) append(v);
            continue;
        }
        const m = /^(msgctxt|msgid_plural|msgid|msgstr)(?:\[(\d+)\])?\s+(.*)$/.exec(line);
        if (!m) {
            const word = /^\S+/.exec(line)![0];
            errors.push(`${file}:${lineNo}: keyword "${word}" unknown`);
            errors.push(`${file}:${lineNo}:1: syntax error`);
            continue;
        }
        const [, name, index, rest] = m;
        if (name === 'msgctxt' || (name === 'msgid' && !(cur && field?.name === 'msgctxt' && !sawMsgstr))) {
            if (cur) finish();
            cur = fresh(lineNo, obsolete);
        }
        if (!cur) { errors.push(`${file}:${lineNo}:1: syntax error`); continue; }
        if (name === 'msgid') cur.line = lineNo;
        if (name === 'msgstr') sawMsgstr = true;
        field = { name, index: index !== undefined ? parseInt(index, 10) : 0 };
        if (name === 'msgstr' && cur.msgstr[field.index] === undefined) cur.msgstr[field.index] = '';
        const v = stringAt(rest, lineNo);
        if (v !== null) append(v);
    }
    finish();
    return { entries: entries.filter(e => !e.obsolete), errors };
}

/** The header entry's field value (e.g. "Plural-Forms"). */
export function headerField(header: string, name: string): string | undefined {
    const re = new RegExp(`^${name.replace(/[-]/g, '\\-')}:[ \\t]*(.*)$`, 'mi');
    return re.exec(header)?.[1];
}

/**
 * Formats `keyword "value"` the way GNU writes PO files: one line when it
 * fits in `width` and has no inner newline, else `keyword ""` followed by
 * pieces broken after each \n and at spaces.
 */
export function formatPoString(keyword: string, value: string, width = 79): string {
    const escaped = poEscape(value);
    const inner = escaped.indexOf('\\n');
    const hasInnerNewline = inner !== -1 && inner + 2 < escaped.length;
    if (!hasInnerNewline && keyword.length + 1 + escaped.length + 2 <= width) return `${keyword} "${escaped}"\n`;
    if (width <= 0 || escaped === '') return `${keyword} "${escaped}"\n`;
    const segments = escaped.split(/(?<=\\n)/);
    let out = `${keyword} ""\n`;
    for (const seg of segments) {
        let rest = seg;
        while (rest.length + 2 > width) {
            // Break after the last space that keeps the line within the width.
            let cut = -1;
            for (let i = 0; i < rest.length && i + 1 + 2 <= width; i++) if (rest[i] === ' ') cut = i + 1;
            if (cut <= 0) { const sp = rest.indexOf(' '); cut = sp === -1 ? rest.length : sp + 1; }
            if (cut >= rest.length) break;
            out += `"${rest.substring(0, cut)}"\n`;
            rest = rest.substring(cut);
        }
        out += `"${rest}"\n`;
    }
    return out;
}

/** Writes one entry (comments, references, flags, strings). */
export function formatPoEntry(e: PoEntry, width = 79, noLocation = false): string {
    let out = '';
    for (const c of e.comments) out += c ? `# ${c}\n` : '#\n';
    for (const c of e.extracted) out += `#. ${c}\n`;
    if (!noLocation && e.references.length) {
        let line = '#:';
        for (const r of e.references) {
            if (line.length > 2 && line.length + 1 + r.length > width) { out += line + '\n'; line = '#:'; }
            line += ' ' + r;
        }
        out += line + '\n';
    }
    if (e.flags.length) out += `#, ${e.flags.join(', ')}\n`;
    if (e.msgctxt !== undefined) out += formatPoString('msgctxt', e.msgctxt, width);
    out += formatPoString('msgid', e.msgid, width);
    if (e.msgidPlural !== undefined) {
        out += formatPoString('msgid_plural', e.msgidPlural, width);
        e.msgstr.forEach((s, i) => { out += formatPoString(`msgstr[${i}]`, s ?? '', width); });
    } else out += formatPoString('msgstr', e.msgstr[0] ?? '', width);
    return out;
}
