import { NodeExecutor } from '../NodeExecutor';
import { ASTNode, PipelineNode } from '../../../interfaces/ShellAST';
import { TerminalState } from '../../../entities/TerminalState';
import { IOContext, inputFromString } from '../io/IOContext';
import { BufferSink } from '../io/OutputSink';
import { ShellResult, ShellRuntime } from '../ShellRuntime';
import { getOption } from '../expansion/ShellVariables';

/**
 * PipelineExecutor - `[!] cmd1 | cmd2 | ...` (XCU §2.9.2).
 *
 * Each stage's stdout feeds the next stage's stdin. Stages of a multi-command
 * pipeline run in subshell environments, so their variable/cwd changes are
 * discarded (as in dash). The status is the last stage's (or, with
 * `set -o pipefail`, the last non-zero one), inverted by `!`.
 */
export class PipelineExecutor implements NodeExecutor {
    constructor(private runtime: ShellRuntime) { }

    async execute(node: ASTNode, state: TerminalState, io: IOContext): Promise<ShellResult> {
        const pipe = node as PipelineNode;
        const parts = pipe.parts;
        if (pipe.negate) this.runtime.conditionDepth++;

        let input = io.stdin;
        let last: ShellResult | undefined;
        let failed = 0;
        try {
            for (let i = 0; i < parts.length; i++) {
                const isLast = i === parts.length - 1;
                const sink = isLast ? io.stdout : new BufferSink();
                last = await this.runtime.visit(parts[i], state, io.withStdin(input).withStdout(sink));
                if (last.status !== 0) failed = last.status;
                if (!isLast) input = inputFromString((sink as BufferSink).contents());
            }
        } finally {
            if (pipe.negate) this.runtime.conditionDepth--;
        }

        let status = getOption(state, 'pipefail') ? failed : last!.status;
        if (pipe.negate) status = status === 0 ? 1 : 0;
        const finalState = parts.length > 1 ? state : last!.state;
        const flow = parts.length > 1 ? undefined : last!.flow;

        return {
            status,
            state: { ...finalState, lastExitCode: status },
            flow,
            effects: last!.effects,
            errexitEligible: !pipe.negate && status !== 0,
        };
    }
}
