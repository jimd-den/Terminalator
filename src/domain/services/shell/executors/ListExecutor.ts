import { NodeExecutor } from '../NodeExecutor';
import { ASTNode, ListNode, NodeType } from '../../ShellParser';
import { TerminalState } from '../../../entities/TerminalState';
import { CommandResponse } from '../../../entities/Command';
import { mergeState } from '../../../utils/TerminalStateUtils';

export class ListExecutor implements NodeExecutor {
    async execute(
        node: ASTNode,
        state: TerminalState,
        visitor: (node: ASTNode, state: TerminalState, stdin?: string) => Promise<CommandResponse>,
        stdin?: string
    ): Promise<CommandResponse> {
        if (node.type !== NodeType.LIST) {
            throw new Error('ListExecutor can only handle LIST nodes');
        }

        const listNode = node as ListNode;
        const leftRes = await visitor(listNode.left, state, stdin);

        // Control flow check (Break/Continue/Return)
        if (leftRes.controlFlow) return leftRes;

        let runRight = false;
        if (listNode.operator === ';') runRight = true;
        else if (listNode.operator === '&&') runRight = (leftRes.exitCode === 0);
        else if (listNode.operator === '||') runRight = (leftRes.exitCode !== 0);

        if (runRight) {
            const effectiveLeftState = mergeState(state, leftRes.newState);
            // Persist exit code logic should be in mergeState or handled here?
            // In ShellInterpreter it was: if (leftRes.newState) effectiveLeftState.lastExitCode = leftRes.exitCode;
            // Let's replicate exact logic.
            if (leftRes.newState) {
                effectiveLeftState.lastExitCode = leftRes.exitCode;
            } else {
                // If not in newState, update it explicitly in effective state
                effectiveLeftState.lastExitCode = leftRes.exitCode;
            }

            const rightRes = await visitor(listNode.right, effectiveLeftState, stdin);

            return {
                output: [leftRes.output, rightRes.output].filter(s => s).join(''),
                newState: mergeState(effectiveLeftState, rightRes.newState),
                exitCode: rightRes.exitCode,
                uiAction: rightRes.uiAction || leftRes.uiAction,
                navigationAction: rightRes.navigationAction || leftRes.navigationAction,
                controlFlow: rightRes.controlFlow,
                command: rightRes.command // Propagate command
            };
        }

        return leftRes;
    }
}
