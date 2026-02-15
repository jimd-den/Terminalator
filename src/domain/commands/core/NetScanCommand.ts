/**
 * NetScanCommand.ts - Core Command
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * Lattice Node Scanner (net-scan)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { CommandBase } from '../CommandBase';
import { CommandCapability } from '../IStructuredCommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../entities/Command';

export class NetScanCommand extends CommandBase {
    public readonly capabilities = [CommandCapability.LIST];
    public readonly utility = 'net-scan';

    protected async executeInternal(
        rawArgs: string[],
        flags: Set<string>,
        operands: string[],
        context: ProcessContext,
        state: TerminalState
    ): Promise<CommandResponse> {
        console.log(`[NetScanCommand] Executing. Has NetworkMap: ${!!context.networkMap}`);
        if (!context.networkMap) {
            return { output: 'net-scan: network service unavailable', exitCode: 1, newState: state };
        }

        const output: string[] = [
            "Scanning Lattice node topology..."
        ];

        const hosts = context.networkMap.getAllHosts();
        console.log(`[NetScanCommand] Found ${hosts.length} hosts in NetworkMap.`);
        
        hosts.forEach(hostname => {
            if (hostname === 'terminalator') return;
            output.push(`Node detected: ${hostname} (LAT:[${Math.floor(Math.random() * 254)}])`);
            output.push("Status: ACTIVE");
        });

        output.push(`Scan complete: ${hosts.length} systems identified.`);

        return {
            output: output.join('\n'),
            exitCode: 0,
            newState: state
        };
    }
}
