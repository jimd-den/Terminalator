/**
 * SedMachine - executes a parsed sed script over an input stream
 * (pattern space, hold space, cycles, ranges and the append queue).
 */
import { Address, Addr2, Replacement, SedCommand } from './SedScript';

export interface SedIO {
    /** Writes to a `w` file (opened/truncated on first use). */
    writeFile(path: string, data: string): void;
    /** Contents for `r`/`R` (null if unreadable). */
    readFile(path: string): string | null;
}

export interface SedOptions {
    quiet: boolean;
    /** Lines from separate files are numbered separately ($ per file). */
    separate: boolean;
}

export class SedMachine {
    private hold = '';
    private lastRe: RegExp | null = null;
    private lineNo = 0;
    private exitCode: number | null = null;
    private rLines = new Map<string, string[]>();

    constructor(private cmds: SedCommand[], private opts: SedOptions, private io: SedIO) {
        const labels = new Map<string, number>();
        cmds.forEach((c, i) => { if (c.name === ':') labels.set(c.text!, i); });
        for (const c of cmds) {
            if ('btT'.includes(c.name) && c.text) {
                const target = labels.get(c.text);
                if (target === undefined) throw new Error(`can't find label for jump to \`${c.text}'`);
                c.jump = target;
            }
        }
    }

    /** Runs over one input (a file's lines); returns output and the q/Q exit code if any. */
    run(lines: string[], isLastInput: boolean): { out: string; quit: number | null } {
        let out = '';
        let idx = 0;
        const hasNext = () => idx < lines.length;
        const isLast = () => idx >= lines.length && isLastInput;
        const next = () => { this.lineNo++; return lines[idx++]; };
        const appendQueue: string[] = [];
        const flushAppends = () => { for (const a of appendQueue) out += a; appendQueue.length = 0; };

        if (this.opts.separate) this.lineNo = 0;
        while (hasNext() && this.exitCode === null) {
            let ps = next();
            let tFlag = false;
            let restart = false;
            do {
                restart = false;
                let deleted = false;
                let pc = 0;
                while (pc < this.cmds.length) {
                    const c = this.cmds[pc];
                    if (!this.selected(c, ps, isLast())) {
                        pc = c.name === '{' ? c.jump! : pc + 1;
                        continue;
                    }
                    pc++;
                    switch (c.name) {
                        case '{': case '}': case ':': break;
                        case '=': out += `${this.lineNo}\n`; break;
                        case 'a': appendQueue.push(c.text + '\n'); break;
                        case 'i': out += c.text + '\n'; break;
                        case 'c':
                            if (!c.a2 || !c.rangeActive || c.negate) out += c.text + '\n';
                            deleted = true; pc = this.cmds.length; break;
                        case 'd': deleted = true; pc = this.cmds.length; break;
                        case 'D': {
                            const nl = ps.indexOf('\n');
                            if (nl < 0) { deleted = true; pc = this.cmds.length; break; }
                            ps = ps.substring(nl + 1);
                            flushAppends();
                            restart = true;
                            pc = this.cmds.length;
                            break;
                        }
                        case 'g': ps = this.hold; break;
                        case 'G': ps += '\n' + this.hold; break;
                        case 'h': this.hold = ps; break;
                        case 'H': this.hold += '\n' + ps; break;
                        case 'x': [ps, this.hold] = [this.hold, ps]; break;
                        case 'z': ps = ''; break;
                        case 'l': out += this.list(ps, c.num ?? 70); break;
                        case 'n':
                            if (!this.opts.quiet) out += ps + '\n';
                            flushAppends();
                            if (!hasNext()) { deleted = true; pc = this.cmds.length; this.exitCode = this.exitCode ?? null; break; }
                            ps = next();
                            break;
                        case 'N':
                            flushAppends();
                            if (!hasNext()) { pc = this.cmds.length; break; }
                            ps += '\n' + next();
                            break;
                        case 'p': out += ps + '\n'; break;
                        case 'P': out += ps.split('\n')[0] + '\n'; break;
                        case 'F': out += '-\n'; break;
                        case 'q': this.exitCode = c.num ?? 0; pc = this.cmds.length; break;
                        case 'Q': this.exitCode = c.num ?? 0; deleted = true; pc = this.cmds.length; break;
                        case 'r': {
                            const data = this.io.readFile(c.text!);
                            if (data !== null) appendQueue.push(data.endsWith('\n') || data === '' ? data : data + '\n');
                            break;
                        }
                        case 'R': {
                            if (!this.rLines.has(c.text!)) this.rLines.set(c.text!, (this.io.readFile(c.text!) ?? '').split('\n').filter((l, k, a) => k < a.length - 1 || l !== ''));
                            const queue = this.rLines.get(c.text!)!;
                            if (queue.length) appendQueue.push(queue.shift()! + '\n');
                            break;
                        }
                        case 'w': this.io.writeFile(c.text!, ps + '\n'); break;
                        case 'W': this.io.writeFile(c.text!, ps.split('\n')[0] + '\n'); break;
                        case 'b': pc = c.text ? c.jump! : this.cmds.length; break;
                        case 't': if (tFlag) { tFlag = false; pc = c.text ? c.jump! : this.cmds.length; } break;
                        case 'T': if (!tFlag) { pc = c.text ? c.jump! : this.cmds.length; } else tFlag = false; break;
                        case 'y': {
                            const from = [...c.from!], to = [...c.to!];
                            ps = [...ps].map(ch => { const k = from.indexOf(ch); return k >= 0 ? to[k] : ch; }).join('');
                            break;
                        }
                        case 's': {
                            const res = this.substitute(c, ps);
                            if (res !== null) {
                                ps = res;
                                tFlag = true;
                                for (let k = 0; k < (c.print ?? 0); k++) out += ps + '\n';
                                if (c.wfile) this.io.writeFile(c.wfile, ps + '\n');
                            }
                            break;
                        }
                    }
                }
                if (!deleted && !restart && !this.opts.quiet) out += ps + '\n';
                if (!restart) flushAppends();
            } while (restart && this.exitCode === null);
        }
        return { out, quit: this.exitCode };
    }

    private matchAddress(a: Address, ps: string, last: boolean): boolean {
        switch (a.kind) {
            case 'line': return this.lineNo === a.n;
            case 'last': return last;
            case 'zero': return false;
            case 'step': return a.step <= 0 ? this.lineNo === a.first : this.lineNo >= a.first && (this.lineNo - a.first) % a.step === 0;
            case 'regex': {
                const re = this.regex(a.re);
                re.lastIndex = 0;
                return re.test(ps);
            }
        }
    }

    private selected(c: SedCommand, ps: string, last: boolean): boolean {
        if (c.name === '}' || c.name === ':') return true;
        if (!c.a1) return !c.negate;
        let hit: boolean;
        if (!c.a2) {
            hit = this.matchAddress(c.a1, ps, last);
        } else if (c.rangeActive) {
            hit = true;
            const a2: Addr2 = c.a2;
            if (a2.kind === 'line') { if (this.lineNo >= a2.n) c.rangeActive = false; }
            else if (a2.kind === 'plus' || a2.kind === 'multiple') { if (this.lineNo >= c.rangeEnd!) c.rangeActive = false; }
            else if (this.matchAddress(a2 as Address, ps, last)) c.rangeActive = false;
        } else {
            const starts = c.a1.kind === 'zero' ? this.lineNo === 1 : this.matchAddress(c.a1, ps, last);
            if (starts) {
                hit = true;
                const a2: Addr2 = c.a2;
                if (c.a1.kind === 'zero' && a2.kind === 'regex' && this.matchAddress(a2, ps, last)) {
                    c.rangeActive = false;
                } else if (a2.kind === 'line') {
                    c.rangeActive = a2.n > this.lineNo;
                } else if (a2.kind === 'plus') {
                    c.rangeEnd = this.lineNo + a2.n;
                    c.rangeActive = a2.n > 0;
                } else if (a2.kind === 'multiple') {
                    c.rangeEnd = a2.n > 0 ? Math.ceil(this.lineNo / a2.n) * a2.n : this.lineNo;
                    c.rangeActive = c.rangeEnd > this.lineNo;
                } else {
                    c.rangeActive = !(a2.kind === 'last' && last);
                }
            } else {
                hit = false;
            }
        }
        return c.negate ? !hit : hit;
    }

    private regex(re: RegExp | null): RegExp {
        if (re) { this.lastRe = re; return re; }
        if (!this.lastRe) throw new Error('no previous regular expression');
        return this.lastRe;
    }

    private substitute(c: SedCommand, ps: string): string | null {
        const re = this.regex(c.re!);
        re.lastIndex = 0;
        let out = '';
        let pos = 0;
        let count = 0;
        let replaced = false;
        let prevEnd = -1;
        while (pos <= ps.length) {
            re.lastIndex = pos;
            const m = re.exec(ps);
            if (!m) break;
            if (m[0] === '' && m.index === prevEnd) {
                // An empty match right after the previous match is not a new match.
                if (m.index >= ps.length) break;
                out += ps[m.index];
                pos = m.index + 1;
                continue;
            }
            count++;
            const wanted = c.occurrence ?? 1;
            const doIt = c.global ? count >= wanted : count === wanted;
            out += ps.substring(pos, m.index);
            if (doIt) {
                out += this.expand(c.replacement!, m);
                replaced = true;
            } else {
                out += m[0];
            }
            prevEnd = m.index + m[0].length;
            if (m[0] === '') {
                if (m.index >= ps.length) { pos = ps.length + 1; break; }
                out += ps[m.index];
                pos = m.index + 1;
            } else {
                pos = prevEnd;
            }
            if (doIt && !c.global) break;
        }
        if (!replaced) return null;
        if (pos <= ps.length) out += ps.substring(pos);
        return out;
    }

    private expand(parts: Replacement[], m: RegExpExecArray): string {
        let out = '';
        let mode: 'L' | 'U' | null = null;
        let once: 'l' | 'u' | null = null;
        const add = (text: string) => {
            for (const ch of text) {
                let c = mode === 'U' ? ch.toUpperCase() : mode === 'L' ? ch.toLowerCase() : ch;
                if (once) { c = once === 'u' ? c.toUpperCase() : c.toLowerCase(); once = null; }
                out += c;
            }
        };
        for (const p of parts) {
            if (p.kind === 'lit') add(p.text);
            else if (p.kind === 'group') add(m[p.n] ?? '');
            else if (p.mode === 'E') { mode = null; once = null; }
            else if (p.mode === 'L' || p.mode === 'U') mode = p.mode;
            else once = p.mode;
        }
        return out;
    }

    private list(ps: string, width: number): string {
        const esc: Record<string, string> = { '\\': '\\\\', '\x07': '\\a', '\b': '\\b', '\f': '\\f', '\n': '\\n', '\r': '\\r', '\t': '\\t', '\v': '\\v' };
        let line = '';
        let out = '';
        for (const ch of ps) {
            const code = ch.charCodeAt(0);
            const piece = esc[ch] ?? (code < 32 || code >= 127 ? '\\' + code.toString(8).padStart(3, '0') : ch);
            if (width > 1 && line.length + piece.length > width - 1) {
                out += line + '\\\n';
                line = '';
            }
            line += piece;
        }
        return out + line + '$\n';
    }
}
