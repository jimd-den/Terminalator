import { ASTNode, NodeType, IfNode, ForNode, WhileNode, SubshellNode, BlockNode, FunctionDefNode, CommandNode, RedirectNode } from '../../interfaces/ShellAST';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../entities/Command';

/**
 * NodeExecutor Interface
 * 
 * Strategy definition for executing AST Nodes.
 * Part of the Refactoring to Open/Closed Principle.
 */
export interface NodeExecutor {
    /**
     * Executes the given AST Node.
     * 
     * @param node - The AST Node to execute
     * @param state - Current terminal state
     * @param visitor - Callback to visit child nodes (recursion)
     * @param stdin - Optional standard input
     */
    execute(
        node: ASTNode,
        state: TerminalState,
        visitor: (node: ASTNode, state: TerminalState, stdin?: string) => Promise<CommandResponse>,
        stdin?: string
    ): Promise<CommandResponse>;
}
