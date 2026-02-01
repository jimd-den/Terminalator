import { NodeExecutor } from '../NodeExecutor';
import { ASTNode, NodeType, SubshellNode } from '../../ShellParser';
import { TerminalState } from '../../../entities/TerminalState';
import { CommandResponse } from '../../../entities/Command';
import { mergeState } from '../../../utils/TerminalStateUtils';

export class SubshellExecutor implements NodeExecutor {
    async execute(
        node: ASTNode,
        state: TerminalState,
        visitor: (node: ASTNode, state: TerminalState, stdin?: string) => Promise<CommandResponse>,
        stdin?: string
    ): Promise<CommandResponse> {
        if (node.type !== NodeType.SUBSHELL) throw new Error('SubshellExecutor handles SUBSHELL only');

        const subNode = node as SubshellNode;
        // Subshell = clone state (env changes lost) but FS changes persist
        const subState = mergeState(state, { environment: { ...state.environment } });
        const res = await visitor(subNode.root, subState, stdin);

        return { ...res, newState: state }; // Discard env changes
    }
}
