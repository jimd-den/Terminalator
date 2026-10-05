/**
 * AwkRecords - record and field splitting (XCU awk "Input", "Regular
 * Expressions" for FS, and the RS variable).
 *
 * RS: "\n" (default) or any single character separates records; an empty RS
 * selects paragraph mode (records separated by blank lines, newline always
 * a field separator); a longer RS is an ERE (common extension).
 * FS: " " splits on runs of blanks/newlines ignoring leading and trailing
 * ones; any other single character separates fields literally; anything
 * longer is an ERE; "" splits into characters (common extension).
 */
import { AwkRegexCache } from './AwkRegex';

/** Sequential reader of records from one input's text. */
export class RecordReader {
    private pos = 0;

    constructor(private readonly data: string, private readonly regexes: AwkRegexCache) { }

    /** The next record under the separator `rs`, or null at end of input. */
    read(rs: string): string | null {
        const data = this.data;
        const len = data.length;
        if (rs === '') return this.readParagraph();
        if (this.pos >= len) return null;
        if (rs.length === 1) {
            const idx = data.indexOf(rs, this.pos);
            const end = idx === -1 ? len : idx;
            const rec = data.slice(this.pos, end);
            this.pos = idx === -1 ? len : idx + 1;
            return rec;
        }
        const re = this.regexes.get(rs).global;
        re.lastIndex = this.pos;
        let m: RegExpExecArray | null;
        while ((m = re.exec(data)) !== null && m[0].length === 0) re.lastIndex++;
        const rec = data.slice(this.pos, m ? m.index : len);
        this.pos = m ? m.index + m[0].length : len;
        return rec;
    }

    private readParagraph(): string | null {
        const data = this.data;
        while (this.pos < data.length && data[this.pos] === '\n') this.pos++;
        if (this.pos >= data.length) return null;
        const re = /\n\n+/g;
        re.lastIndex = this.pos;
        const m = re.exec(data);
        if (m) {
            const rec = data.slice(this.pos, m.index);
            this.pos = m.index + m[0].length;
            return rec;
        }
        const rec = data.slice(this.pos).replace(/\n+$/, '');
        this.pos = data.length;
        return rec;
    }
}

const BLANKS = /[ \t\n]+/;

/**
 * Splits `s` into fields by `fs`. `paragraph` (RS == "") adds newline as a
 * separator. `regex` forces ERE interpretation (split() with an /ERE/).
 */
export function splitFields(s: string, fs: string, regexes: AwkRegexCache, paragraph = false, regex = false): string[] {
    if (s === '') return [];
    if (!regex && fs === ' ') {
        const t = s.replace(/^[ \t\n]+/, '').replace(/[ \t\n]+$/, '');
        return t === '' ? [] : t.split(BLANKS);
    }
    if (!regex && fs === '') return Array.from(s);
    if (!regex && fs.length === 1 && fs !== '\\' && !paragraph) return s.split(fs);
    let source: string;
    if (!regex && fs.length === 1) source = /[\\^$.[\]|()*+?{}]/.test(fs) ? '\\' + fs : fs;
    else source = fs;
    if (paragraph) source = `(${source})|\n`;
    const re = regexes.get(source).global;
    const out: string[] = [];
    let start = 0;
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(s)) !== null) {
        if (m[0].length === 0) {
            // An empty match separates nothing.
            re.lastIndex = m.index + 1;
            if (re.lastIndex > s.length) break;
            continue;
        }
        out.push(s.slice(start, m.index));
        start = m.index + m[0].length;
    }
    out.push(s.slice(start));
    return out;
}
