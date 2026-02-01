import { NodeExecutor } from '../NodeExecutor';
import { ASTNode, NodeType } from '../../ShellParser';
import { TerminalState } from '../../../entities/TerminalState';
import { CommandResponse } from '../../../entities/Command';

export class BlockExecutor implements NodeExecutor {
    async execute(
        node: ASTNode,
        state: TerminalState,
        visitor: (node: ASTNode, state: TerminalState, stdin?: string) => Promise<CommandResponse>,
        stdin?: string
    ): Promise<CommandResponse> {
        if (node.type !== NodeType.BLOCK) throw new Error('BlockExecutor handles BLOCK only');

        // Block is just a wrapper around a body
        return visitor((node as any).body, state, stdin);
    }
}
