/**
 * expr - evaluate arguments as an expression (POSIX XCU expr).
 *
 * Operators (lowest to highest): |  &  = > >= < <= !=  + -  * / %  :
 * plus parentheses and the common extensions `length`, `substr`,
 * `index` and `match`. Exit status: 0 non-null/non-zero result,
 * 1 null or zero, 2 invalid expression, 3 other error.
 */
import { ICommand, CommandResponse } from '../ICommand';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { FileSystemService } from '../../services/FileSystemService';
import { compilePosixRegex } from '../../utils/PosixRegex';

class ExprError extends Error {
    constructor(message: string, public status = 2) { super(message); }
}

type Value = string;
const isInt = (v: Value) => /^[-+]?[0-9]+$/.test(v);
const toInt = (v: Value) => {
    if (!isInt(v)) throw new ExprError('non-integer argument');
    return parseInt(v, 10);
};

export class ExprCommand implements ICommand {
    constructor(private fs?: FileSystemService) { }

    execute(args: string[], _context: ProcessContext, state: TerminalState): CommandResponse {
        if (args.length === 0) return { output: '', stderr: 'expr: missing operand\n', exitCode: 2, newState: state };
        try {
            const parser = new Parser(args[0] === '--' ? args.slice(1) : args);
            const value = parser.parse();
            const nullish = value === '' || (isInt(value) && parseInt(value, 10) === 0);
            return { output: value + '\n', exitCode: nullish ? 1 : 0, newState: state };
        } catch (e: any) {
            const status = e instanceof ExprError ? e.status : 3;
            return { output: '', stderr: `expr: ${e.message}\n`, exitCode: status, newState: state };
        }
    }
}

class Parser {
    private i = 0;
    constructor(private t: string[]) { }

    parse(): Value {
        const v = this.or();
        if (this.i < this.t.length) throw new ExprError(`syntax error: unexpected argument '${this.t[this.i]}'`);
        return v;
    }

    private peek() { return this.t[this.i]; }

    private or(): Value {
        let l = this.and();
        while (this.peek() === '|') {
            this.i++;
            const r = this.and();
            l = l !== '' && !(isInt(l) && toInt(l) === 0) ? l : (r !== '' && !(isInt(r) && toInt(r) === 0) ? r : '0');
        }
        return l;
    }

    private and(): Value {
        let l = this.cmp();
        while (this.peek() === '&') {
            this.i++;
            const r = this.cmp();
            const truthy = (v: Value) => v !== '' && !(isInt(v) && toInt(v) === 0);
            l = truthy(l) && truthy(r) ? l : '0';
        }
        return l;
    }

    private cmp(): Value {
        let l = this.add();
        while (['=', '>', '>=', '<', '<=', '!='].includes(this.peek())) {
            const op = this.t[this.i++];
            const r = this.add();
            const c = isInt(l) && isInt(r) ? toInt(l) - toInt(r) : (l < r ? -1 : l > r ? 1 : 0);
            const res = op === '=' ? c === 0 : op === '!=' ? c !== 0 : op === '>' ? c > 0 : op === '>=' ? c >= 0 : op === '<' ? c < 0 : c <= 0;
            l = res ? '1' : '0';
        }
        return l;
    }

    private add(): Value {
        let l = this.mul();
        while (this.peek() === '+' || this.peek() === '-') {
            const op = this.t[this.i++];
            const r = this.mul();
            l = String(op === '+' ? toInt(l) + toInt(r) : toInt(l) - toInt(r));
        }
        return l;
    }

    private mul(): Value {
        let l = this.match();
        while (this.peek() === '*' || this.peek() === '/' || this.peek() === '%') {
            const op = this.t[this.i++];
            const r = this.match();
            const a = toInt(l), b = toInt(r);
            if (op !== '*' && b === 0) throw new ExprError('division by zero');
            l = String(op === '*' ? a * b : op === '/' ? Math.trunc(a / b) : a % b);
        }
        return l;
    }

    private match(): Value {
        let l = this.primary();
        while (this.peek() === ':') {
            this.i++;
            l = this.regexMatch(l, this.primary());
        }
        return l;
    }

    private regexMatch(s: string, pattern: string): Value {
        const re = compilePosixRegex(pattern);
        const m = new RegExp('^(?:' + re.source + ')').exec(s);
        const hasGroup = /\\\(/.test(pattern);
        if (!m) return hasGroup ? '' : '0';
        return hasGroup ? (m[1] ?? '') : String(m[0].length);
    }

    private primary(): Value {
        const tok = this.t[this.i];
        if (tok === undefined) throw new ExprError('syntax error: missing argument');
        if (tok === '(') {
            this.i++;
            const v = this.or();
            if (this.t[this.i] !== ')') throw new ExprError("syntax error: expecting ')'");
            this.i++;
            return v;
        }
        // Extensions (only when followed by enough operands).
        if (tok === 'length' && this.i + 1 < this.t.length) { this.i++; return String(this.primary().length); }
        if (tok === 'match' && this.i + 2 < this.t.length) { this.i++; const s = this.primary(); return this.regexMatch(s, this.primary()); }
        if (tok === 'index' && this.i + 2 < this.t.length) {
            this.i++;
            const s = this.primary(), chars = this.primary();
            let pos = 0;
            for (let k = 0; k < s.length; k++) if (chars.includes(s[k])) { pos = k + 1; break; }
            return String(pos);
        }
        if (tok === 'substr' && this.i + 3 < this.t.length) {
            this.i++;
            const s = this.primary(), p = toInt(this.primary()), n = toInt(this.primary());
            if (p < 1 || n < 1) return '';
            return s.substr(p - 1, n);
        }
        if (tok === '+' && this.i + 1 < this.t.length) { this.i++; return this.t[this.i++]; }
        this.i++;
        return tok;
    }
}
