import { NodeExecutor } from '../NodeExecutor';
import { ASTNode, BlockNode } from '../../../interfaces/ShellAST';
import { TerminalState } from '../../../entities/TerminalState';
import { IOContext } from '../io/IOContext';
import { ShellResult, ShellRuntime } from '../ShellRuntime';

/** BlockExecutor - `{ list; }`: runs in the current environment. */
export class BlockExecutor implements NodeExecutor {
    constructor(private runtime: ShellRuntime) { }

    execute(node: ASTNode, state: TerminalState, io: IOContext): Promise<ShellResult> {
        return this.runtime.visit((node as BlockNode).body, state, io);
    }
}
