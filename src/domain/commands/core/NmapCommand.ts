/**
 * NmapCommand.ts - Core Command
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * Network Scanner (nmap)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { CommandBase } from '../CommandBase';
import { CommandCapability } from '../IStructuredCommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../entities/Command';

export class NmapCommand extends CommandBase {
    public readonly capabilities = [CommandCapability.LIST];
    public readonly utility = 'nmap';

    protected async executeInternal(
        rawArgs: string[],
        flags: Set<string>,
        operands: string[],
        context: ProcessContext,
        state: TerminalState
    ): Promise<CommandResponse> {
        if (!context.networkMap) {
            return { output: 'nmap: network service unavailable', exitCode: 1, newState: state };
        }

        // Simulating: nmap -sn 10.0.0.0/24
        const output: string[] = [
            "Starting Nmap 7.80 ( https://nmap.org ) at 2026-02-14 21:35 UTC"
        ];

        // Get all hosts from WorldManager via networkMap
        const hosts = context.networkMap.getAllHosts();
        
        hosts.forEach(hostname => {
            if (hostname === 'terminalator') return;
            output.push(`Nmap scan report for ${hostname} (10.0.0.${Math.floor(Math.random() * 254)})`);
            output.push("Host is up (0.0012s latency).");
        });

        output.push(`Nmap done: ${hosts.length} IP addresses ( ${hosts.length} hosts up) scanned in 1.45 seconds`);

        return {
            output: output.join('\n'),
            exitCode: 0,
            newState: state
        };
    }
}
