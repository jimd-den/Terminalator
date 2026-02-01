import { NodeExecutor } from '../NodeExecutor';
import { ASTNode, NodeType, FunctionDefNode } from '../../ShellParser';
import { TerminalState } from '../../../entities/TerminalState';
import { CommandResponse } from '../../../entities/Command';
import { mergeState, success } from '../../../utils/TerminalStateUtils';

export class FunctionDefExecutor implements NodeExecutor {
    async execute(
        node: ASTNode,
        state: TerminalState,
        visitor: (node: ASTNode, state: TerminalState, stdin?: string) => Promise<CommandResponse>,
        stdin?: string
    ): Promise<CommandResponse> {
        if (node.type !== NodeType.FUNCTION_DEF) throw new Error('FunctionDefExecutor handles FUNCTION_DEF only');

        const funcNode = node as FunctionDefNode;
        const newFunctions = new Map(state.functions);
        newFunctions.set(funcNode.name, funcNode);
        return success(mergeState(state, { functions: newFunctions }));
    }
}
