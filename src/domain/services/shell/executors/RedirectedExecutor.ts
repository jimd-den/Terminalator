import { NodeExecutor } from '../NodeExecutor';
import { ASTNode, RedirectedNode } from '../../../interfaces/ShellAST';
import { TerminalState } from '../../../entities/TerminalState';
import { IOContext } from '../io/IOContext';
import { ShellResult, ShellRuntime } from '../ShellRuntime';

/** RedirectedExecutor - a compound command with a redirect list (`while ...; done < f`). */
export class RedirectedExecutor implements NodeExecutor {
    constructor(private runtime: ShellRuntime) { }

    async execute(node: ASTNode, state: TerminalState, io: IOContext): Promise<ShellResult> {
        const r = node as RedirectedNode;
        const scope = this.runtime.newScope(state, io);
        let redirected: IOContext;
        try {
            redirected = await this.runtime.redirector.apply(r.redirects, scope, io);
        } catch (e: any) {
            io.stderr.write(`sh: ${e?.message ?? e}\n`);
            return { status: 2, state: { ...scope.state, lastExitCode: 2 }, errexitEligible: true };
        }
        return this.runtime.visit(r.body, scope.state, redirected);
    }
}
