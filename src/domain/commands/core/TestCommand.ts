/**
 * test / [ - evaluate expression (POSIX XCU test).
 *
 * Implements the POSIX argument-count rules for 0–4 arguments and a
 * precedence parser (! > -a > -o, with parentheses) beyond that.
 * Exit status: 0 true, 1 false, 2 error.
 */
import { ICommand, CommandResponse } from '../ICommand';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { FileSystemService } from '../../services/FileSystemService';
import { canAccess, statPath } from '../shared/FileInfo';
import { S_ISUID, S_ISGID, S_ISVTX } from '../../entities/FileSystem';

class TestError extends Error { }

const UNARY = new Set(['-b', '-c', '-d', '-e', '-f', '-g', '-h', '-L', '-n', '-p', '-r', '-S', '-s', '-t', '-u', '-w', '-x', '-z', '-k', '-O', '-G']);
const BINARY = new Set(['=', '!=', '==', '-eq', '-ne', '-gt', '-ge', '-lt', '-le', '-nt', '-ot', '-ef', '<', '>']);

export class TestCommand implements ICommand {
    constructor(private fs?: FileSystemService) { }

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        const bracket = context.argv0 === '[';
        let operands = args;
        if (bracket) {
            if (operands[operands.length - 1] !== ']') return this.error(state, "[: missing ']'");
            operands = operands.slice(0, -1);
        }
        try {
            const result = new Evaluator(operands, context).evaluate();
            return { output: '', exitCode: result ? 0 : 1, newState: state };
        } catch (e: any) {
            return this.error(state, `test: ${e.message}`);
        }
    }

    private error(state: TerminalState, message: string): CommandResponse {
        return { output: '', stderr: message + '\n', exitCode: 2, newState: state };
    }
}

class Evaluator {
    private i = 0;

    constructor(private args: string[], private context: ProcessContext) { }

    evaluate(): boolean {
        const a = this.args;
        switch (a.length) {
            case 0: return false;
            case 1: return a[0] !== '';
            case 2:
                if (a[0] === '!') return a[1] === '';
                if (UNARY.has(a[0])) return this.unary(a[0], a[1]);
                throw new TestError(`${a[0]}: unary operator expected`);
            case 3:
                if (BINARY.has(a[1])) return this.binary(a[0], a[1], a[2]);
                if (a[0] === '!') return !new Evaluator(a.slice(1), this.context).evaluate();
                if (a[0] === '(' && a[2] === ')') return a[1] !== '';
                break;
            case 4:
                if (a[0] === '!') return !new Evaluator(a.slice(1), this.context).evaluate();
                if (a[0] === '(' && a[3] === ')') return new Evaluator(a.slice(1, 3), this.context).evaluate();
                break;
        }
        const result = this.orExpr();
        if (this.i < this.args.length) throw new TestError(`${this.args[this.i]}: unexpected operator`);
        return result;
    }

    private peek(): string | undefined {
        return this.args[this.i];
    }

    private orExpr(): boolean {
        let v = this.andExpr();
        while (this.peek() === '-o') { this.i++; const r = this.andExpr(); v = v || r; }
        return v;
    }

    private andExpr(): boolean {
        let v = this.notExpr();
        while (this.peek() === '-a') { this.i++; const r = this.notExpr(); v = v && r; }
        return v;
    }

    private notExpr(): boolean {
        if (this.peek() === '!') { this.i++; return !this.notExpr(); }
        return this.primary();
    }

    private primary(): boolean {
        const t = this.args[this.i];
        if (t === undefined) throw new TestError('argument expected');
        if (t === '(') {
            this.i++;
            const v = this.orExpr();
            if (this.args[this.i] !== ')') throw new TestError("missing ')'");
            this.i++;
            return v;
        }
        const op = this.args[this.i + 1];
        if (op !== undefined && BINARY.has(op) && this.args[this.i + 2] !== undefined) {
            this.i += 3;
            return this.binary(t, op, this.args[this.i - 1]);
        }
        if (UNARY.has(t) && this.args[this.i + 1] !== undefined) {
            this.i += 2;
            return this.unary(t, this.args[this.i - 1]);
        }
        this.i++;
        return t !== '';
    }

    private integer(s: string): number {
        const t = s.trim();
        if (!/^[-+]?[0-9]+$/.test(t)) throw new TestError(`${s}: integer expression expected`);
        return parseInt(t, 10);
    }

    private binary(a: string, op: string, b: string): boolean {
        switch (op) {
            case '=': case '==': return a === b;
            case '!=': return a !== b;
            case '<': return a < b;
            case '>': return a > b;
            case '-eq': return this.integer(a) === this.integer(b);
            case '-ne': return this.integer(a) !== this.integer(b);
            case '-gt': return this.integer(a) > this.integer(b);
            case '-ge': return this.integer(a) >= this.integer(b);
            case '-lt': return this.integer(a) < this.integer(b);
            case '-le': return this.integer(a) <= this.integer(b);
            case '-nt': case '-ot': {
                const fa = statPath(this.context, a), fb = statPath(this.context, b);
                if (op === '-nt') return !!fa && (!fb || fa.inode.mtime > fb.inode.mtime);
                return !!fb && (!fa || fa.inode.mtime < fb.inode.mtime);
            }
            case '-ef': {
                const fa = statPath(this.context, a), fb = statPath(this.context, b);
                return !!fa && !!fb && fa.inode.id === fb.inode.id;
            }
        }
        throw new TestError(`${op}: unknown operator`);
    }

    private unary(op: string, operand: string): boolean {
        if (op === '-n') return operand.length > 0;
        if (op === '-z') return operand.length === 0;
        if (op === '-t') return false; // no fd is a terminal device in a test
        const follow = op !== '-h' && op !== '-L';
        const info = statPath(this.context, operand, follow);
        if (!info) return false;
        switch (op) {
            case '-e': return true;
            case '-f': return info.kind === 'regular';
            case '-d': return info.kind === 'directory';
            case '-h': case '-L': return info.kind === 'symlink';
            case '-b': return info.kind === 'block';
            case '-c': return info.kind === 'char';
            case '-p': return info.kind === 'fifo';
            case '-S': return info.kind === 'socket';
            case '-s': return info.inode.size > 0;
            case '-r': return canAccess(this.context, info, 4);
            case '-w': return canAccess(this.context, info, 2);
            case '-x': return canAccess(this.context, info, 1);
            case '-u': return (info.inode.mode & S_ISUID) !== 0;
            case '-g': return (info.inode.mode & S_ISGID) !== 0;
            case '-k': return (info.inode.mode & S_ISVTX) !== 0;
            case '-O': return info.inode.uid === this.context.user.uid;
            case '-G': return info.inode.gid === this.context.user.gid;
        }
        return false;
    }
}
