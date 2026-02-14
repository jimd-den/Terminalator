/**
 * SshCommand.ts - Core Command
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * Secure Shell (ssh)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Simulated SSH command that switches the terminal's FS context.
 */

import { CommandBase } from '../CommandBase';
import { CommandCapability } from '../IStructuredCommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../entities/Command';
import { mergeState } from '../../utils/TerminalStateUtils';

export class SshCommand extends CommandBase {
    public readonly capabilities = [CommandCapability.MODIFY];
    public readonly utility = 'ssh';

    protected async executeInternal(
        rawArgs: string[],
        flags: Set<string>,
        operands: string[],
        context: ProcessContext,
        state: TerminalState
    ): Promise<CommandResponse> {
        if (operands.length === 0) {
            return { output: 'usage: ssh [user@]hostname', exitCode: 1, newState: state };
        }

        let target = operands[0];
        let user = 'root';

        if (target.includes('@')) {
            const parts = target.split('@');
            user = parts[0];
            target = parts[1];
        }

        if (!context.networkMap) {
            return { output: 'ssh: network service unavailable', exitCode: 1, newState: state };
        }

        // Try to find the system by hostname or mock IP
        const system = context.networkMap.getSystem(target);
        if (!system) {
            return { output: `ssh: connect to host ${target} port 22: Connection refused`, exitCode: 1, newState: state };
        }

        // Update Terminal State to the new FS context
        const newState = mergeState(state, {
            fsContext: target,
            currentDirectory: '/home/admin' // Default login dir
        });

        return {
            output: `Connected to ${target}.
Welcome to ${target} (GNU/Linux).`,
            exitCode: 0,
            newState
        };
    }
}
