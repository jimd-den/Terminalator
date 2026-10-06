import { NodeExecutor } from '../NodeExecutor';
import { ASTNode, TimedNode } from '../../../interfaces/ShellAST';
import { TerminalState } from '../../../entities/TerminalState';
import { IOContext } from '../io/IOContext';
import { ShellResult, ShellRuntime, ok } from '../ShellRuntime';

/** TimedExecutor - `time [-p] pipeline`: runs it and reports elapsed time on stderr. */
export class TimedExecutor implements NodeExecutor {
    constructor(private runtime: ShellRuntime) { }

    async execute(node: ASTNode, state: TerminalState, io: IOContext): Promise<ShellResult> {
        const t = node as TimedNode;
        const started = Date.now();
        const res = t.body ? await this.runtime.visit(t.body, state, io) : ok(state, 0);
        const seconds = (Date.now() - started) / 1000;
        if (t.posix) {
            io.stderr.write(`real ${seconds.toFixed(2)}\nuser ${seconds.toFixed(2)}\nsys 0.00\n`);
        } else {
            const fmt = (s: number) => `${Math.floor(s / 60)}m${(s % 60).toFixed(3)}s`;
            io.stderr.write(`\nreal\t${fmt(seconds)}\nuser\t${fmt(seconds)}\nsys\t0m0.000s\n`);
        }
        return res;
    }
}
