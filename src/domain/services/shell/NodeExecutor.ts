import { ASTNode } from '../../interfaces/ShellAST';
import { TerminalState } from '../../entities/TerminalState';
import { IOContext } from './io/IOContext';
import { ShellResult } from './ShellRuntime';

/**
 * NodeExecutor - Strategy for executing one kind of AST node (OCP).
 * Children are executed through the runtime's `visit`.
 */
export interface NodeExecutor {
    execute(node: ASTNode, state: TerminalState, io: IOContext): Promise<ShellResult>;
}
