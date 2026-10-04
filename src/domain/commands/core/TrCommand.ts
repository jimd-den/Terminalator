/**
 * tr - translate characters (POSIX):
 *   tr [-c|-C] [-s] string1 string2
 *   tr -s [-c|-C] string1
 *   tr -d [-c|-C] string1
 *   tr -ds [-c|-C] string1 string2
 * Strings support escapes (\n, \ooo...), ranges (a-z), classes ([:alpha:]),
 * equivalence classes ([=c=]) and repeats ([x*n], [x*]).
 */
import { CommandResponse } from '../ICommand';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { FileSystemService } from '../../services/FileSystemService';
import { CommandCapability } from '../IStructuredCommand';
import { Utility } from '../shared/Utility';
import { getopt, readInput } from '../shared/InputFiles';

const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => String.fromCharCode(a + i));
const ALL = range(0, 255);
const CLASSES: Record<string, string[]> = {
    alpha: [...range(65, 90), ...range(97, 122)],
    upper: range(65, 90),
    lower: range(97, 122),
    digit: range(48, 57),
    alnum: [...range(48, 57), ...range(65, 90), ...range(97, 122)],
    xdigit: [...range(48, 57), ...range(65, 70), ...range(97, 102)],
    space: ['\t', '\n', '\v', '\f', '\r', ' '],
    blank: ['\t', ' '],
    punct: ALL.filter(c => /[!-\/:-@\[-`{-~]/.test(c)),
    print: range(32, 126),
    graph: range(33, 126),
    cntrl: [...range(0, 31), '\x7f'],
};

class TrError extends Error { }

type Item = { chars: string[]; repeat?: { count: number | null } ; cls?: string };

const ESC: Record<string, string> = { '\\': '\\', a: '\x07', b: '\b', f: '\f', n: '\n', r: '\r', t: '\t', v: '\v' };

/** Reads one (possibly escaped) character at s[i]; returns [char, nextIndex]. */
function readChar(s: string, i: number): [string, number] {
    if (s[i] !== '\\' || i + 1 >= s.length) return [s[i], i + 1];
    const n = s[i + 1];
    if (/[0-7]/.test(n)) {
        let j = i + 1;
        let digits = '';
        while (j < s.length && digits.length < 3 && /[0-7]/.test(s[j])) digits += s[j++];
        return [String.fromCharCode(parseInt(digits, 8) & 0xff), j];
    }
    return [ESC[n] ?? n, i + 2];
}

function parseSet(s: string, second: boolean): Item[] {
    const items: Item[] = [];
    let i = 0;
    while (i < s.length) {
        if (s[i] === '[' && s[i + 1] === ':') {
            const end = s.indexOf(':]', i + 2);
            if (end !== -1) {
                const name = s.substring(i + 2, end);
                if (!CLASSES[name]) throw new TrError(`invalid character class '${name}'`);
                items.push({ chars: CLASSES[name], cls: name });
                i = end + 2;
                continue;
            }
        }
        if (s[i] === '[' && s[i + 1] === '=') {
            const end = s.indexOf('=]', i + 2);
            if (end !== -1) {
                items.push({ chars: [readChar(s, i + 2)[0]] });
                i = end + 2;
                continue;
            }
        }
        if (s[i] === '[' && i + 2 < s.length) {
            const [c, j] = readChar(s, i + 1);
            if (s[j] === '*') {
                const end = s.indexOf(']', j + 1);
                if (end !== -1 && /^[0-9]*$/.test(s.substring(j + 1, end))) {
                    if (!second) throw new TrError('the [c*] repeat construct may not appear in string1');
                    const n = s.substring(j + 1, end);
                    const count = n === '' ? null : parseInt(n, n.startsWith('0') ? 8 : 10) || null;
                    items.push({ chars: [c], repeat: { count } });
                    i = end + 1;
                    continue;
                }
            }
        }
        const [c, j] = readChar(s, i);
        if (s[j] === '-' && j + 1 < s.length) {
            const [d, k] = readChar(s, j + 1);
            if (d.charCodeAt(0) < c.charCodeAt(0)) {
                throw new TrError(`range-endpoints of '${c}-${d}' are in reverse collating sequence order`);
            }
            items.push({ chars: range(c.charCodeAt(0), d.charCodeAt(0)) });
            i = k;
            continue;
        }
        items.push({ chars: [c] });
        i = j;
    }
    return items;
}

function flatten(items: Item[], targetLength?: number): string[] {
    const fixed = items.reduce((n, it) => n + (it.repeat ? it.repeat.count ?? 0 : it.chars.length), 0);
    const out: string[] = [];
    for (const it of items) {
        if (it.repeat) {
            const n = it.repeat.count ?? Math.max(0, (targetLength ?? fixed) - fixed);
            for (let k = 0; k < n; k++) out.push(it.chars[0]);
        } else out.push(...it.chars);
    }
    return out;
}

export class TrCommand extends Utility {
    readonly utility = 'tr';
    readonly capabilities = [CommandCapability.TRANSFORM];

    constructor(private fs?: FileSystemService) { super(); }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const { opts, operands, error } = getopt(args, 'cCdst');
        if (error) return this.usage(state, error);
        const del = opts.has('d'), squeeze = opts.has('s'), complement = opts.has('c') || opts.has('C');
        const needed = del && squeeze ? 2 : del || (squeeze && operands.length === 1) ? 1 : 2;
        if (operands.length < needed) {
            return this.usage(state, operands.length ? `missing operand after '${operands[operands.length - 1]}'` : 'missing operand');
        }
        if (operands.length > needed) return this.usage(state, `extra operand '${operands[needed]}'`);

        let set1: string[], set2: string[] = [];
        try {
            set1 = flatten(parseSet(operands[0], false));
            if (complement) set1 = ALL.filter(c => !set1.includes(c));
            if (operands.length > 1) {
                const items2 = parseSet(operands[1], true);
                // Case conversion: [:lower:] <-> [:upper:] map position by position.
                set2 = flatten(items2, set1.length);
                if (!del && !(squeeze && operands.length === 1)) {
                    if (opts.has('t')) set1 = set1.slice(0, set2.length);
                    else if (set2.length === 0) throw new TrError('when not truncating set1, string2 must be non-empty');
                    else while (set2.length < set1.length) set2.push(set2[set2.length - 1]);
                }
            }
        } catch (e: any) {
            if (e instanceof TrError) return this.usage(state, e.message);
            throw e;
        }

        const input = readInput(context, '-');
        if (!input.ok) return this.respond(state, '', [input.error]);
        const inSet1 = new Set(set1);
        const map = new Map<string, string>();
        if (!del && set2.length) set1.forEach((c, i) => map.set(c, set2[i]));
        const squeezeSet = new Set(del ? set2 : operands.length === 1 ? set1 : set2);

        let out = '';
        let last: string | null = null;
        for (const ch of input.data) {
            if (del && inSet1.has(ch)) continue;
            const c = map.get(ch) ?? ch;
            if (squeeze && squeezeSet.has(c) && c === last) continue;
            out += c;
            last = c;
        }
        return this.respond(state, out);
    }
}
