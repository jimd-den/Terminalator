import { NodeExecutor } from '../NodeExecutor';
import { ASTNode, FunctionDefNode } from '../../../interfaces/ShellAST';
import { TerminalState } from '../../../entities/TerminalState';
import { ShellResult, ok } from '../ShellRuntime';

/** FunctionDefExecutor - `name() compound-command` stores the definition. */
export class FunctionDefExecutor implements NodeExecutor {
    async execute(node: ASTNode, state: TerminalState): Promise<ShellResult> {
        const fn = node as FunctionDefNode;
        const functions = new Map(state.functions);
        functions.set(fn.name, fn);
        return ok({ ...state, functions }, 0);
    }
}
