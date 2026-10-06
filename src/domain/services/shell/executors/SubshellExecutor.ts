import { NodeExecutor } from '../NodeExecutor';
import { ASTNode, SubshellNode } from '../../../interfaces/ShellAST';
import { TerminalState } from '../../../entities/TerminalState';
import { IOContext } from '../io/IOContext';
import { ShellResult, ShellRuntime } from '../ShellRuntime';

/**
 * SubshellExecutor - `( list )`: runs in a copy of the environment.
 * Variable, cwd, option and trap changes are discarded; `exit` only
 * leaves the subshell. File system changes persist (shared kernel state).
 */
export class SubshellExecutor implements NodeExecutor {
    constructor(private runtime: ShellRuntime) { }

    async execute(node: ASTNode, state: TerminalState, io: IOContext): Promise<ShellResult> {
        // Traps are reset in a subshell, but one may set its own EXIT trap.
        const subState: TerminalState = { ...state, traps: new Map() };
        let res = await this.runtime.visit((node as SubshellNode).root, subState, io);
        const exitTrap = res.state.traps?.get('EXIT');
        if (exitTrap) {
            const trapRes = await this.runtime.runSource(exitTrap, { ...res.state, traps: new Map() }, io);
            if (trapRes.flow?.kind === 'exit') res = { ...res, status: trapRes.status };
        }
        return {
            status: res.status,
            state: { ...state, lastExitCode: res.status },
            effects: res.effects,
            errexitEligible: res.status !== 0,
        };
    }
}
