import { NodeExecutor } from '../NodeExecutor';
import { ASTNode, ListNode } from '../../../interfaces/ShellAST';
import { TerminalState } from '../../../entities/TerminalState';
import { IOContext } from '../io/IOContext';
import { ShellResult, ShellRuntime, mergeEffects, withStatus } from '../ShellRuntime';

/**
 * ListExecutor - sequential lists (`;`) and AND-OR lists (`&&`, `||`).
 * The left operand of `&&`/`||` is a "tested" context for `set -e`.
 */
export class ListExecutor implements NodeExecutor {
    constructor(private runtime: ShellRuntime) { }

    async execute(node: ASTNode, state: TerminalState, io: IOContext): Promise<ShellResult> {
        const list = node as ListNode;
        const tested = list.operator !== ';';

        if (tested) this.runtime.conditionDepth++;
        let left: ShellResult;
        try {
            left = withStatus(await this.runtime.visit(list.left, state, io));
        } finally {
            if (tested) this.runtime.conditionDepth--;
        }
        if (left.flow) return left;

        const runRight =
            list.operator === ';' ||
            (list.operator === '&&' && left.status === 0) ||
            (list.operator === '||' && left.status !== 0);
        if (!runRight) return { ...left, errexitEligible: false };

        const right = withStatus(await this.runtime.visit(list.right, left.state, io));
        return { ...right, effects: mergeEffects(left.effects, right.effects) };
    }
}
