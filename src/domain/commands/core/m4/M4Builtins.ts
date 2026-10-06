/**
 * M4Builtins - the builtin macros of GNU m4 1.4 (POSIX set plus the GNU
 * extensions builtin, indir, esyscmd, format, regexp, patsubst, __file__,
 * __line__, __program__, debugging no-ops).
 *
 * Each builtin receives the collected arguments (args[0] is the name it was
 * called by) and pushes its expansion back onto the input for rescanning.
 * `blind` builtins are only recognised when followed by `(`.
 */
import type { M4Processor } from './M4Processor';
import { Arg, M4Exit } from './M4Types';
import { CIntExpr, CExprError } from '../../../utils/CIntExpr';
import { compileM4Regex, substituteMatch } from './M4Regex';

export interface BuiltinSpec {
    blind: boolean;
    /** GNU extension (absent with -G). */
    gnu?: boolean;
    run(m: M4Processor, a: Arg[]): void | Promise<void>;
}

const name = (a: Arg[]) => a[0].text;
const arg = (a: Arg[], i: number) => a[i]?.text ?? '';

/** Checks argc (including the name); warns. Returns true when there are too few arguments. */
function tooFew(m: M4Processor, a: Arg[], min: number, max: number): boolean {
    if (a.length < min) {
        m.warn(`Warning: too few arguments to builtin \`${name(a)}'`);
        return true;
    }
    if (max >= 0 && a.length > max) m.warn(`Warning: excess arguments to builtin \`${name(a)}' ignored`);
    return false;
}

/** strtol-style numeric argument; null (after an error) when not numeric. */
function numeric(m: M4Processor, a: Arg[], text: string): number | null {
    if (text === '') {
        m.warn(`empty string treated as 0 in builtin \`${name(a)}'`);
        return 0;
    }
    const match = /^[ \t\n\r\f\v]*[-+]?[0-9]+$/.exec(text);
    if (!match) {
        m.error(`non-numeric argument to builtin \`${name(a)}'`);
        return null;
    }
    if (/^\s/.test(text)) m.warn(`leading whitespace ignored in builtin \`${name(a)}'`);
    return Number(BigInt.asIntN(32, BigInt(text.trim())));
}

const int32 = (v: number) => Number(BigInt.asIntN(32, BigInt(v)));

/** translit ranges: `a-z` expands, a leading or trailing `-` is literal, `z-a` descends. */
function expandRanges(s: string): string {
    let out = '';
    for (let i = 0; i < s.length; i++) {
        if (s[i] === '-' && out.length > 0 && i + 1 < s.length) {
            let from = out.charCodeAt(out.length - 1);
            const to = s.charCodeAt(++i);
            if (from <= to) while (from++ < to) out += String.fromCharCode(from);
            else while (--from >= to) out += String.fromCharCode(from);
        } else out += s[i];
    }
    return out;
}

function compile(m: M4Processor, pattern: string): RegExp | null {
    try {
        return compileM4Regex(pattern);
    } catch (e: any) {
        m.error(`bad regular expression: \`${pattern}': ${e?.message ?? 'invalid'}`);
        return null;
    }
}

const EVAL_DIALECT = { bits: 32 as const, signed: true, power: true, m4Literals: true, singleEquals: true };

function evalBuiltin(m: M4Processor, a: Arg[]) {
    if (tooFew(m, a, 2, 4)) return;
    let radix = 10;
    if (arg(a, 2) !== '') {
        const r = numeric(m, a, arg(a, 2));
        if (r === null) return;
        radix = r;
    }
    if (radix < 1 || radix > 36) { m.error(`radix ${radix} in builtin \`${name(a)}' out of range`); return; }
    let width = 0;
    if (a.length >= 4) {
        const w = numeric(m, a, arg(a, 3));
        if (w === null) return;
        width = w;
    }
    if (width < 0) { m.error(`negative width to builtin \`${name(a)}'`); return; }
    const source = arg(a, 1);
    let value = 0n;
    if (source === '') m.warn(`empty string treated as 0 in builtin \`${name(a)}'`);
    else {
        try {
            const expr = CIntExpr.compile(source, EVAL_DIALECT);
            if (expr.usedSingleEquals) m.warn('Warning: recommend ==, not =, for equality operator');
            value = expr.evaluate();
        } catch (e) {
            if (!(e instanceof CExprError)) throw e;
            const what = e.kind === 'missing' ? 'bad expression in eval' : e.kind === 'bad input' || e.kind === 'excess input'
                ? `bad expression in eval (${e.kind})` : `${e.kind} in eval`;
            m.error(`${what}: ${source}`);
            return;
        }
    }
    const negative = value < 0n;
    const abs = negative ? -value : value;
    const digits = radix === 1 ? '1'.repeat(Number(abs)) : abs.toString(radix);
    m.pushText((negative ? '-' : '') + digits.padStart(width, '0'));
}

/** format: printf-like formatting of the GNU extension. */
function formatBuiltin(m: M4Processor, a: Arg[]) {
    if (tooFew(m, a, 2, -1)) return;
    const fmt = arg(a, 1);
    let next = 2;
    const take = () => (next < a.length ? a[next++].text : '');
    const toInt = (s: string) => {
        const v = parseInt(s.trim(), /^\s*[-+]?0[xX]/.test(s) ? 16 : 10);
        return Number.isNaN(v) ? 0 : int32(v);
    };
    let out = '';
    for (let i = 0; i < fmt.length; i++) {
        if (fmt[i] !== '%') { out += fmt[i]; continue; }
        const mt = /^%([-+ #0']*)(\*|[0-9]*)(?:\.(\*|[0-9]*))?[hl]*([diouxXcseEfFgGaA%])?/.exec(fmt.substring(i))!;
        i += mt[0].length - 1;
        const conv = mt[4];
        if (!conv) { m.warn(`Warning: unrecognized specifier in \`${fmt}'`); continue; }
        if (conv === '%') { out += '%'; continue; }
        let flags = mt[1];
        let width = mt[2] === '*' ? toInt(take()) : mt[2] ? parseInt(mt[2], 10) : 0;
        if (width < 0) { flags += '-'; width = -width; }
        const precision = mt[3] === undefined ? undefined : mt[3] === '*' ? toInt(take()) : parseInt(mt[3] || '0', 10);
        const pad = (body: string, sign = '', numericPad = true) => {
            const len = sign.length + body.length;
            if (len >= width) return sign + body;
            if (flags.includes('-')) return sign + body + ' '.repeat(width - len);
            if (numericPad && flags.includes('0')) return sign + '0'.repeat(width - len) + body;
            return ' '.repeat(width - len) + sign + body;
        };
        const raw = take();
        if (conv === 's') { out += pad(precision === undefined ? raw : raw.substring(0, precision), '', false); continue; }
        if (conv === 'c') { out += pad(String.fromCharCode(toInt(raw) & 0xff), '', false); continue; }
        if (/[diouxX]/.test(conv)) {
            const v = toInt(raw);
            let sign = '';
            let digits: string;
            if (conv === 'd' || conv === 'i') {
                sign = v < 0 ? '-' : flags.includes('+') ? '+' : flags.includes(' ') ? ' ' : '';
                digits = String(Math.abs(v));
            } else {
                const u = v >>> 0;
                digits = u.toString(conv === 'o' ? 8 : conv === 'u' ? 10 : 16);
                if (conv === 'X') digits = digits.toUpperCase();
                if (flags.includes('#') && u !== 0) {
                    if (conv === 'o') digits = '0' + digits;
                    else if (conv !== 'u') sign = conv === 'x' ? '0x' : '0X';
                }
            }
            if (precision !== undefined) digits = precision === 0 && digits === '0' ? '' : digits.padStart(precision, '0');
            out += pad(digits, sign, precision === undefined);
            continue;
        }
        let v = parseFloat(raw);
        if (Number.isNaN(v)) v = 0;
        const sign = v < 0 ? '-' : flags.includes('+') ? '+' : flags.includes(' ') ? ' ' : '';
        v = Math.abs(v);
        const p = precision ?? 6;
        const expo = (x: number, digits: number) => {
            const [mant, e] = x.toExponential(digits).split('e');
            const n = parseInt(e, 10);
            return `${mant}e${n < 0 ? '-' : '+'}${String(Math.abs(n)).padStart(2, '0')}`;
        };
        let body: string;
        if (!Number.isFinite(v)) body = 'inf';
        else if (conv === 'f' || conv === 'F') body = v.toFixed(p);
        else if (conv === 'e' || conv === 'E') body = expo(v, p);
        else if (conv === 'a' || conv === 'A') body = v.toString(16);
        else {
            const P = p === 0 ? 1 : p;
            const x = v === 0 ? 0 : Math.floor(Math.log10(Number(v.toExponential(P - 1))));
            body = x < -4 || x >= P ? expo(v, P - 1) : v.toFixed(Math.max(0, P - 1 - x));
            if (!flags.includes('#') && body.includes('.')) body = body.replace(/\.?0+(e|$)/, '$1');
        }
        if (/[A-Z]/.test(conv)) body = body.toUpperCase();
        out += pad(body, sign);
    }
    m.pushText(out);
}

export const BUILTINS: Record<string, BuiltinSpec> = {
    define: {
        blind: true,
        run(m, a) {
            if (tooFew(m, a, 2, 3)) return;
            m.define(arg(a, 1), a[2]?.builtin ? { builtin: a[2].builtin } : { text: arg(a, 2) });
        },
    },
    pushdef: {
        blind: true,
        run(m, a) {
            if (tooFew(m, a, 2, 3)) return;
            m.pushdef(arg(a, 1), a[2]?.builtin ? { builtin: a[2].builtin } : { text: arg(a, 2) });
        },
    },
    undefine: { blind: true, run(m, a) { if (!tooFew(m, a, 2, -1)) for (const x of a.slice(1)) m.undefine(x.text); } },
    popdef: { blind: true, run(m, a) { if (!tooFew(m, a, 2, -1)) for (const x of a.slice(1)) m.popdef(x.text); } },
    defn: {
        blind: true,
        run(m, a) {
            if (tooFew(m, a, 2, -1)) return;
            let text = '';
            for (const x of a.slice(1)) {
                const def = m.lookup(x.text);
                if (!def) continue;
                if ('text' in def) text += m.quote(def.text);
                else if (a.length === 2) { m.pushBuiltin(def.builtin); return; }
                else m.warn(`Warning: cannot concatenate builtin \`${def.builtin}'`);
            }
            m.pushText(text);
        },
    },
    indir: {
        blind: true, gnu: true,
        async run(m, a) {
            if (tooFew(m, a, 2, -1)) return;
            const def = m.lookup(arg(a, 1));
            if (!def) { m.error(`undefined macro \`${arg(a, 1)}'`); return; }
            await m.invoke(def, [{ text: arg(a, 1) }, ...a.slice(2)]);
        },
    },
    builtin: {
        blind: true, gnu: true,
        async run(m, a) {
            if (tooFew(m, a, 2, -1)) return;
            const target = a[1].builtin ?? arg(a, 1);
            if (!m.builtinSpec(target)) { m.error(`undefined builtin \`${target}'`); return; }
            await m.invoke({ builtin: target }, [{ text: target }, ...a.slice(2)]);
        },
    },
    ifdef: {
        blind: true,
        run(m, a) { if (!tooFew(m, a, 3, 4)) m.pushText(m.lookup(arg(a, 1)) ? arg(a, 2) : arg(a, 3)); },
    },
    ifelse: {
        blind: true,
        run(m, a) {
            if (a.length === 2) return;
            if (tooFew(m, a, 4, -1)) return;
            if ((a.length + 2) % 3 > 1) m.warn(`Warning: excess arguments to builtin \`${name(a)}' ignored`);
            let n = a.length - 1;
            let base = 1;
            for (;;) {
                if (arg(a, base) === arg(a, base + 1)) { m.pushText(arg(a, base + 2)); return; }
                if (n === 3) return;
                if (n === 4 || n === 5) { m.pushText(arg(a, base + 3)); return; }
                n -= 3;
                base += 3;
            }
        },
    },
    shift: {
        blind: true,
        run(m, a) { if (!tooFew(m, a, 2, -1)) m.pushText(a.slice(2).map(x => m.quote(x.text)).join(',')); },
    },
    changequote: {
        blind: false,
        run(m, a) {
            tooFew(m, a, 1, 3);
            if (a.length < 2) { m.lquote = '`'; m.rquote = "'"; return; }
            const lq = arg(a, 1);
            let rq = a.length >= 3 ? arg(a, 2) : '';
            if (lq && !rq) rq = "'";
            m.lquote = lq;
            m.rquote = rq;
        },
    },
    changecom: {
        blind: false,
        run(m, a) {
            tooFew(m, a, 1, 3);
            if (a.length < 2) { m.bcomm = ''; m.ecomm = ''; return; }
            const bc = arg(a, 1);
            let ec = a.length >= 3 ? arg(a, 2) : '';
            if (bc && !ec) ec = '\n';
            m.bcomm = bc;
            m.ecomm = ec;
        },
    },
    divert: {
        blind: false,
        run(m, a) {
            tooFew(m, a, 1, 2);
            const n = a.length >= 2 ? numeric(m, a, arg(a, 1)) : 0;
            if (n !== null) m.divnum = n;
        },
    },
    divnum: { blind: false, run(m, a) { tooFew(m, a, 1, 1); m.pushText(String(m.divnum)); } },
    undivert: {
        blind: false,
        run(m, a) {
            if (a.length === 1) { m.undivertAll(); return; }
            for (const x of a.slice(1)) {
                if (/^[-+]?[0-9]+$/.test(x.text) || (m.options.traditional && !/^\s/.test(x.text))) {
                    const n = numeric(m, a, x.text);
                    if (n !== null) m.undivert(n);
                    continue;
                }
                const file = m.host.readFile(x.text);
                if (file.ok) m.write(file.data);
                else m.error(`cannot undivert \`${x.text}': ${file.error}`);
            }
        },
    },
    dnl: { blind: false, run(m, a) { tooFew(m, a, 1, 1); m.discardLine(); } },
    len: { blind: true, run(m, a) { if (!tooFew(m, a, 2, 2)) m.pushText(String(arg(a, 1).length)); } },
    index: {
        blind: true,
        run(m, a) {
            if (tooFew(m, a, 3, 3)) { if (a.length === 2) m.pushText('0'); return; }
            m.pushText(String(arg(a, 1).indexOf(arg(a, 2))));
        },
    },
    substr: {
        blind: true,
        run(m, a) {
            if (tooFew(m, a, 3, 4)) { if (a.length === 2) m.pushText(arg(a, 1)); return; }
            const s = arg(a, 1);
            const start = numeric(m, a, arg(a, 2));
            if (start === null) return;
            let length = s.length;
            if (a.length >= 4) {
                const l = numeric(m, a, arg(a, 3));
                if (l === null) return;
                length = l;
            }
            if (start < 0 || length <= 0 || start >= s.length) return;
            m.pushText(s.substr(start, length));
        },
    },
    translit: {
        blind: true,
        run(m, a) {
            if (tooFew(m, a, 3, 4)) { if (a.length === 2) m.pushText(arg(a, 1)); return; }
            const from = expandRanges(arg(a, 2));
            const to = expandRanges(arg(a, 3));
            const map = new Map<string, string>();
            for (let i = 0, j = 0; i < from.length; i++) {
                if (!map.has(from[i])) map.set(from[i], j < to.length ? to[j] : '');
                if (j < to.length) j++;
            }
            let out = '';
            for (const c of arg(a, 1)) out += map.has(c) ? map.get(c)! : c;
            m.pushText(out);
        },
    },
    regexp: {
        blind: true, gnu: true,
        run(m, a) {
            if (tooFew(m, a, 3, 4)) { if (a.length === 2) m.pushText('0'); return; }
            const re = compile(m, arg(a, 2));
            if (!re) return;
            const match = re.exec(arg(a, 1));
            if (a.length === 3) m.pushText(String(match ? match.index : -1));
            else if (match) m.pushText(substituteMatch(arg(a, 3), match, w => m.warn(w)));
        },
    },
    patsubst: {
        blind: true, gnu: true,
        run(m, a) {
            if (tooFew(m, a, 3, 4)) { if (a.length === 2) m.pushText(arg(a, 1)); return; }
            const re = compile(m, arg(a, 2));
            if (!re) return;
            const s = arg(a, 1);
            let out = '';
            let offset = 0;
            while (offset <= s.length) {
                re.lastIndex = offset;
                const match = re.exec(s);
                if (!match) { out += s.substring(offset); break; }
                out += s.substring(offset, match.index);
                if (a.length > 3) out += substituteMatch(arg(a, 3), match, w => m.warn(w));
                offset = match.index + match[0].length;
                if (match[0].length === 0) {
                    if (offset < s.length) out += s[offset];
                    offset++;
                }
            }
            m.pushText(out);
        },
    },
    incr: {
        blind: true,
        run(m, a) { if (tooFew(m, a, 2, 2)) return; const v = numeric(m, a, arg(a, 1)); if (v !== null) m.pushText(String(int32(v + 1))); },
    },
    decr: {
        blind: true,
        run(m, a) { if (tooFew(m, a, 2, 2)) return; const v = numeric(m, a, arg(a, 1)); if (v !== null) m.pushText(String(int32(v - 1))); },
    },
    eval: { blind: true, run: evalBuiltin },
    format: { blind: true, gnu: true, run: formatBuiltin },
    include: {
        blind: true,
        run(m, a) {
            if (tooFew(m, a, 2, 2)) return;
            const file = m.host.readFile(arg(a, 1));
            if (file.ok) m.pushFile(arg(a, 1), file.data);
            else m.error(`cannot open \`${arg(a, 1)}': ${file.error}`, true);
        },
    },
    sinclude: {
        blind: true,
        run(m, a) {
            if (tooFew(m, a, 2, 2)) return;
            const file = m.host.readFile(arg(a, 1));
            if (file.ok) m.pushFile(arg(a, 1), file.data);
        },
    },
    syscmd: {
        blind: true,
        async run(m, a) {
            if (tooFew(m, a, 2, 2)) return;
            const r = await m.host.shell(arg(a, 1));
            m.writeStdout(r.output);
            m.sysval = r.status;
        },
    },
    esyscmd: {
        blind: true, gnu: true,
        async run(m, a) {
            if (tooFew(m, a, 2, 2)) return;
            const r = await m.host.shell(arg(a, 1));
            m.sysval = r.status;
            m.pushText(r.output);
        },
    },
    sysval: { blind: false, run(m, a) { tooFew(m, a, 1, 1); m.pushText(String(m.sysval)); } },
    mkstemp: {
        blind: true,
        run(m, a) {
            if (tooFew(m, a, 2, 2)) return;
            const r = m.host.mkstemp(arg(a, 1));
            if (r.ok) m.pushText(m.quote(r.name));
            else m.error(`cannot create file from template \`${arg(a, 1)}': ${r.error}`);
        },
    },
    maketemp: {
        blind: true,
        run(m, a) {
            if (tooFew(m, a, 2, 2)) return;
            m.warn('Warning: recommend using mkstemp instead');
            const r = m.host.mkstemp(arg(a, 1));
            if (r.ok) m.pushText(m.quote(r.name));
            else m.error(`cannot create file from template \`${arg(a, 1)}': ${r.error}`);
        },
    },
    errprint: { blind: true, run(m, a) { if (!tooFew(m, a, 2, -1)) m.printErr(a.slice(1).map(x => x.text).join(' ')); } },
    m4exit: {
        blind: false,
        run(m, a) {
            tooFew(m, a, 1, 2);
            let code = 0;
            if (a.length >= 2) {
                const v = numeric(m, a, arg(a, 1));
                code = v === null ? 1 : v;
            }
            if (code < 0 || code > 255) { m.warn(`exit status out of range: \`${code}'`); code = 1; }
            throw new M4Exit(code === 0 && m.failed ? 1 : code);
        },
    },
    // GNU m4 1.4 runs wrapped text last-in, first-out.
    m4wrap: { blind: true, run(m, a) { if (!tooFew(m, a, 2, -1)) m.wrap(a.slice(1).map(x => x.text).join(' ')); } },
    __file__: { blind: false, gnu: true, run(m, a) { tooFew(m, a, 1, 1); m.pushText(m.quote(m.currentFile().name)); } },
    __line__: { blind: false, gnu: true, run(m, a) { tooFew(m, a, 1, 1); m.pushText(String(m.currentFile().line)); } },
    __program__: { blind: false, gnu: true, run(m, a) { tooFew(m, a, 1, 1); m.pushText(m.quote('m4')); } },
    dumpdef: {
        blind: false,
        run(m, a) {
            const names = a.length > 1 ? a.slice(1).map(x => x.text) : m.names().sort();
            for (const n of names) {
                const def = m.lookup(n);
                if (!def) { m.error(`undefined macro \`${n}'`); continue; }
                m.printErr(`${n}:\t${'text' in def ? m.quote(def.text) : `<${def.builtin}>`}\n`);
            }
        },
    },
    traceon: { blind: false, run() { /* tracing output is not simulated */ } },
    traceoff: { blind: false, run() { /* tracing output is not simulated */ } },
    debugmode: { blind: false, gnu: true, run() { /* debugging output is not simulated */ } },
    debugfile: { blind: false, gnu: true, run() { /* debugging output is not simulated */ } },
};
