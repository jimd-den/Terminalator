import { NodeExecutor } from '../NodeExecutor';
import { ASTNode, NodeType, IfNode, ForNode, WhileNode, CaseNode } from '../../../interfaces/ShellAST';
import { TerminalState } from '../../../entities/TerminalState';
import { IOContext } from '../io/IOContext';
import { ShellResult, ShellRuntime, ok, withStatus } from '../ShellRuntime';
import { ExpansionError } from '../expansion/WordExpander';
import { getPositional, setVariable } from '../expansion/ShellVariables';
import { matchPattern } from '../expansion/PatternMatcher';

/** Guards the UI against runaway loops in a game script. */
export const MAX_LOOP_ITERATIONS = 100000;

/**
 * ControlFlowExecutor - if, for, while/until and case (XCU §2.9.4).
 * break/continue carry a level count and unwind enclosing loops.
 */
export class ControlFlowExecutor implements NodeExecutor {
    constructor(private runtime: ShellRuntime) { }

    async execute(node: ASTNode, state: TerminalState, io: IOContext): Promise<ShellResult> {
        try {
            switch (node.type) {
                case NodeType.IF: return await this.executeIf(node as IfNode, state, io);
                case NodeType.FOR: return await this.executeFor(node as ForNode, state, io);
                case NodeType.WHILE: return await this.executeWhile(node as WhileNode, state, io);
                case NodeType.CASE: return await this.executeCase(node as CaseNode, state, io);
                default: throw new Error(`ControlFlowExecutor cannot handle ${node.type}`);
            }
        } catch (e) {
            if (e instanceof ExpansionError) {
                io.stderr.write(`sh: ${e.message}\n`);
                return { status: e.status, state: { ...state, lastExitCode: e.status } };
            }
            throw e;
        }
    }

    private async condition(node: ASTNode, state: TerminalState, io: IOContext): Promise<ShellResult> {
        this.runtime.conditionDepth++;
        try {
            return withStatus(await this.runtime.visit(node, state, io));
        } finally {
            this.runtime.conditionDepth--;
        }
    }

    private async executeIf(node: IfNode, state: TerminalState, io: IOContext): Promise<ShellResult> {
        const cond = await this.condition(node.condition, state, io);
        if (cond.flow) return cond;
        if (cond.status === 0) return this.runtime.visit(node.thenBody, cond.state, io);
        if (node.elseBody) return this.runtime.visit(node.elseBody, cond.state, io);
        return ok(cond.state, 0);
    }

    /**
     * Applies a loop body's control flow. Returns 'stop' to leave this loop,
     * 'next' to continue, or a result to propagate outward.
     */
    private loopFlow(res: ShellResult): 'next' | 'stop' | ShellResult {
        const flow = res.flow;
        if (!flow) return 'next';
        if (flow.kind === 'break' || flow.kind === 'continue') {
            if (flow.levels > 1) return { ...res, flow: { kind: flow.kind, levels: flow.levels - 1 } };
            return flow.kind === 'break' ? 'stop' : 'next';
        }
        return res;
    }

    private async executeFor(node: ForNode, state: TerminalState, io: IOContext): Promise<ShellResult> {
        let items: string[];
        if (node.items) {
            const scope = this.runtime.newScope(state, io);
            items = await this.runtime.expander.expandWords(node.items, scope);
            state = scope.state;
        } else {
            items = getPositional(state);
        }

        let status = 0;
        for (const item of items) {
            state = setVariable(state, node.variable, item);
            if (!node.body) continue;
            const res = withStatus(await this.runtime.visit(node.body, state, io));
            state = res.state;
            status = res.status;
            const next = this.loopFlow(res);
            if (next === 'stop') break;
            if (next !== 'next') return { ...next, state };
        }
        return ok(state, status);
    }

    private async executeWhile(node: WhileNode, state: TerminalState, io: IOContext): Promise<ShellResult> {
        let status = 0;
        for (let iterations = 0; ; iterations++) {
            if (iterations >= MAX_LOOP_ITERATIONS) {
                io.stderr.write(`sh: loop aborted after ${MAX_LOOP_ITERATIONS} iterations\n`);
                return ok(state, 1);
            }
            const cond = await this.condition(node.condition, state, io);
            state = cond.state;
            if (cond.flow) {
                const next = this.loopFlow(cond);
                if (next === 'stop') break;
                if (next === 'next') continue;
                return next;
            }
            const passed = node.until ? cond.status !== 0 : cond.status === 0;
            if (!passed) break;
            if (!node.body) continue;

            const res = withStatus(await this.runtime.visit(node.body, state, io));
            state = res.state;
            status = res.status;
            const next = this.loopFlow(res);
            if (next === 'stop') break;
            if (next !== 'next') return { ...next, state };
        }
        return ok(state, status);
    }

    private async executeCase(node: CaseNode, state: TerminalState, io: IOContext): Promise<ShellResult> {
        const scope = this.runtime.newScope(state, io);
        const word = await this.runtime.expander.expandString(node.word, scope);
        state = scope.state;

        for (const item of node.items) {
            for (const raw of item.patterns) {
                const pattern = await this.runtime.expander.expandPattern(raw, scope);
                state = scope.state;
                if (matchPattern(pattern, word)) {
                    return item.body ? this.runtime.visit(item.body, state, io) : ok(state, 0);
                }
            }
        }
        return ok(state, 0);
    }
}
