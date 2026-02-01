import { NodeExecutor } from '../NodeExecutor';
import { ASTNode, NodeType, IfNode, ForNode, WhileNode } from '../../ShellParser';
import { TerminalState } from '../../../entities/TerminalState';
import { CommandResponse } from '../../../entities/Command';
import { ShellExpansionService } from '../../ShellExpansionService';
import { mergeState } from '../../../utils/TerminalStateUtils';

export class ControlFlowExecutor implements NodeExecutor {
    constructor(private expansionService: ShellExpansionService) { }

    async execute(
        node: ASTNode,
        state: TerminalState,
        visitor: (node: ASTNode, state: TerminalState, stdin?: string) => Promise<CommandResponse>,
        stdin?: string
    ): Promise<CommandResponse> {
        switch (node.type) {
            case NodeType.IF: return this.executeIf(node as IfNode, state, visitor, stdin);
            case NodeType.FOR: return this.executeFor(node as ForNode, state, visitor, stdin);
            case NodeType.WHILE: return this.executeWhile(node as WhileNode, state, visitor, stdin);
            default: throw new Error(`ControlFlowExecutor cannot handle ${node.type}`);
        }
    }

    private async executeIf(node: IfNode, state: TerminalState, visitor: any, stdin?: string): Promise<CommandResponse> {
        const condRes = await visitor(node.condition, state, stdin);

        if (condRes.exitCode === 0) {
            const thenState = mergeState(state, condRes.newState);
            const res = await visitor(node.thenBody, thenState, stdin);
            return { ...res, output: condRes.output + res.output };
        } else if (node.elseBody) {
            const elseState = mergeState(state, condRes.newState);
            const res = await visitor(node.elseBody, elseState, stdin);
            return { ...res, output: condRes.output + res.output };
        }

        return { output: condRes.output, newState: mergeState(state, condRes.newState), exitCode: 0 };
    }

    private async executeFor(node: ForNode, state: TerminalState, visitor: any, stdin?: string): Promise<CommandResponse> {
        const expandedItems: string[] = [];
        for (const item of node.items) {
            const tokens = this.expansionService.expandToken(item, state.environment, state.currentDirectory);
            expandedItems.push(...tokens);
        }

        let currentState = state;
        let output = '';
        let lastExitCode = 0;

        for (const val of expandedItems) {
            const newEnv = { ...currentState.environment, [node.variable]: val };
            currentState = mergeState(currentState, { environment: newEnv });

            const res = await visitor(node.body, currentState, stdin);
            currentState = mergeState(currentState, res.newState);
            output += res.output;
            lastExitCode = res.exitCode;

            if (res.controlFlow === 'BREAK') { currentState.lastExitCode = 0; break; }
            if (res.controlFlow === 'CONTINUE') continue;
            if (res.controlFlow === 'RETURN') return { ...res, newState: currentState, output };
        }

        return { output, newState: currentState, exitCode: lastExitCode };
    }

    private async executeWhile(node: WhileNode, state: TerminalState, visitor: any, stdin?: string): Promise<CommandResponse> {
        let currentState = state;
        let output = '';
        let lastExitCode = 0;
        let iterations = 0;
        const MAX = 1000; // Circuit breaker

        while (iterations < MAX) {
            const condRes = await visitor(node.condition, currentState, stdin);
            output += condRes.output;
            currentState = mergeState(currentState, condRes.newState);

            if (condRes.exitCode !== 0) break;

            const bodyRes = await visitor(node.body, currentState, stdin);
            currentState = mergeState(currentState, bodyRes.newState);
            output += bodyRes.output;
            lastExitCode = bodyRes.exitCode;

            if (bodyRes.controlFlow === 'BREAK') break;
            if (bodyRes.controlFlow === 'RETURN') return { ...bodyRes, newState: currentState, output };
            iterations++;
        }
        return { output, newState: currentState, exitCode: lastExitCode };
    }
}
