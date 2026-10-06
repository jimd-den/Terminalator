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
            return {
                output: `net-link: connect to host ${target} failed: Link refused\n` +
                        `Hostnames resolve only once discovered — try net-scan first, or give a lattice address.`,
                exitCode: 1,
                newState: state
            };
        }

        // Node metadata is derived, so the banner can describe any machine in
        // the lattice without anything having been stored about it.
        const node = context.networkMap.getNode(target);
        const canonical = node?.hostname ?? target;

        const newState = mergeState(state, {
            fsContext: canonical,
            currentDirectory: '/home/admin'
        });

        const banner = node
            ? [
                `LINK ESTABLISHED — ${canonical} [${node.ip}]`,
                `${node.type} · ${node.components.osType} · security ${node.components.securityLevel}/10 · ${node.components.cpuPower} cyc`,
                node.components.isVendor
                    ? `Vendor node. Stock: ${(node.components.inventory ?? []).join(', ')}`
                    : `Authenticated as ${user}.`
              ].join('\n')
            : `LINK ESTABLISHED to ${target}.`;

        return { output: banner, exitCode: 0, newState };
    }
}
