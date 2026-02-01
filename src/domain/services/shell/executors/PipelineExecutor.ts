import { NodeExecutor } from '../NodeExecutor';
import { ASTNode, PipelineNode, NodeType } from '../../ShellParser';
import { TerminalState } from '../../../entities/TerminalState';
import { CommandResponse } from '../../../entities/Command';
import { mergeState } from '../../../utils/TerminalStateUtils';

export class PipelineExecutor implements NodeExecutor {
    async execute(
        node: ASTNode,
        state: TerminalState,
        visitor: (node: ASTNode, state: TerminalState, stdin?: string) => Promise<CommandResponse>,
        stdin?: string
    ): Promise<CommandResponse> {
        if (node.type !== NodeType.PIPELINE) {
            throw new Error('PipelineExecutor can only handle PIPELINE nodes');
        }

        const pipeNode = node as PipelineNode;
        let currentState = state;
        let currentInput = stdin;
        let lastExitCode = 0;
        let finalUiAction;
        let finalNavAction;
        let finalOutput = '';

        for (let i = 0; i < pipeNode.parts.length; i++) {
            const part = pipeNode.parts[i];
            const isLast = i === pipeNode.parts.length - 1;

            const res = await visitor(part, currentState, currentInput);

            currentInput = res.output;
            currentState = mergeState(currentState, res.newState);
            lastExitCode = res.exitCode;
            currentState.lastExitCode = res.exitCode;

            if (isLast) finalOutput = res.output;
            if (res.uiAction) finalUiAction = res.uiAction;
            if (res.navigationAction) finalNavAction = res.navigationAction;
            if (res.controlFlow === 'RETURN') return res;
        }

        return {
            output: finalOutput,
            newState: currentState,
            exitCode: lastExitCode,
            uiAction: finalUiAction,
            navigationAction: finalNavAction,
            controlFlow: undefined // Pipeline swallows control flow except RETURN? Original code only checked return.
        };
    }
}
