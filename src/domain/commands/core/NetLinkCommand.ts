/**
 * NetLinkCommand.ts - Core Command
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * Secure Net-Link (net-link)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Simulated link command that switches the terminal's FS context.
 */

import { CommandBase } from '../CommandBase';
import { CommandCapability } from '../IStructuredCommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../entities/Command';
import { mergeState } from '../../utils/TerminalStateUtils';

export class NetLinkCommand extends CommandBase {
    public readonly capabilities = [CommandCapability.MODIFY];
    public readonly utility = 'net-link';

    protected async executeInternal(
        rawArgs: string[],
        flags: Set<string>,
        operands: string[],
        context: ProcessContext,
        state: TerminalState
    ): Promise<CommandResponse> {
        if (operands.length === 0) {
            return { output: 'usage: net-link [user@]hostname', exitCode: 1, newState: state };
        }

        let target = operands[0];
        let user = 'root';

        if (target.includes('@')) {
            const parts = target.split('@');
            user = parts[0];
            target = parts[1];
        }

        if (!context.networkMap) {
            return { output: 'net-link: network service unavailable', exitCode: 1, newState: state };
        }

        const system = context.networkMap.getSystem(target);
        if (!system) {
            return { output: `net-link: connect to host ${target} failed: Link refused`, exitCode: 1, newState: state };
        }

        const newState = mergeState(state, {
            fsContext: target,
            currentDirectory: '/home/admin'
        });

        return {
            output: `LINK ESTABLISHED to ${target}.
Welcome to ${target} node cluster.`,
            exitCode: 0,
            newState
        };
    }
}
