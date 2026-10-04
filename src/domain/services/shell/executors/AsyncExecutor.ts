import { NodeExecutor } from '../NodeExecutor';
import { ASTNode, AsyncNode } from '../../../interfaces/ShellAST';
import { TerminalState } from '../../../entities/TerminalState';
import { IOContext, inputFromString } from '../io/IOContext';
import { ShellResult, ShellRuntime } from '../ShellRuntime';
import { printNode } from '../ShellPrinter';

/**
 * AsyncExecutor - `command &` (XCU §2.9.3.1).
 *
 * The simulation runs the job to completion immediately, in a subshell
 * environment with stdin from /dev/null, then records it in the job table
 * (so `jobs`, `wait` and `$!` behave as specified).
 */
export class AsyncExecutor implements NodeExecutor {
    constructor(private runtime: ShellRuntime) { }

    async execute(node: ASTNode, state: TerminalState, io: IOContext): Promise<ShellResult> {
        const body = (node as AsyncNode).body;
        const job = this.runtime.jobControl.createJob(printNode(body));
        const interactive = !state.scriptName && !state.callStackDepth;
        if (interactive) io.stderr.write(`[${job.jobId}] ${job.pid}\n`);

        const res = await this.runtime.visit(body, state, io.withStdin(inputFromString('')));
        this.runtime.jobControl.markDone(job.jobId, res.status);

        return { status: 0, state: { ...state, lastBackgroundPid: job.pid, lastExitCode: 0 } };
    }
}
