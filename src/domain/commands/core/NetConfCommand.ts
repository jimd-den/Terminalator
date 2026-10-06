/**
 * NetConfCommand.ts - Core Command
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * Network Configuration Utility (net-conf)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { CommandBase } from '../CommandBase';
import { CommandCapability } from '../IStructuredCommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../entities/Command';

export class NetConfCommand extends CommandBase {
    public readonly capabilities = [CommandCapability.LIST];
    public readonly utility = 'net-conf';

    protected async executeInternal(
        rawArgs: string[],
        flags: Set<string>,
        operands: string[],
        context: ProcessContext,
        state: TerminalState
    ): Promise<CommandResponse> {
        // Read the interface off the node we are actually standing on. A
        // hardcoded ifconfig made every machine in the lattice look identical,
        // which quietly told the player that exploring was pointless.
        const host = operands[0] ?? state.fsContext ?? 'localhost';
        const node = context.networkMap?.getNode(host);

        if (!node) {
            return {
                output: `net-conf: no interface data for '${host}'`,
                exitCode: 1,
                newState: state
            };
        }

        const octets = node.ip.split(':').pop()!.split('.');
        const broadcast = [...octets.slice(0, 3), '255'].join('.');
        const mac = this.deriveMac(node.ip);

        // Counters are a function of the node's own throughput, so a busy
        // mainframe reads busy and an IOT sensor reads idle -- consistently.
        const rx = node.components.cpuPower * 1373;
        const tx = node.components.cpuPower * 811;

        const output = `
eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500
        inet ${node.ip}  netmask 255.255.255.0  broadcast ${broadcast}
        ether ${mac}  txqueuelen 1000  (Ethernet)
        host ${node.hostname}  os ${node.components.osType}  sec ${node.components.securityLevel}/10
        RX packets ${rx}  bytes ${rx * 74}
        TX packets ${tx}  bytes ${tx * 66}

lo: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536
        inet 127.0.0.1  netmask 255.0.0.0
        loop  txqueuelen 1000  (Local Loopback)
`.trim();

        return { output, exitCode: 0, newState: state };
    }

    /**
     * A stable hardware address for a coordinate. Derived, not random, so the
     * same machine always presents the same NIC.
     */
    private deriveMac(ip: string): string {
        let h = 0x811c9dc5;
        for (let i = 0; i < ip.length; i++) {
            h = Math.imul(h ^ ip.charCodeAt(i), 16777619) >>> 0;
        }
        const bytes = [0x02, (h >>> 24) & 0xff, (h >>> 16) & 0xff, (h >>> 8) & 0xff, h & 0xff, ip.length & 0xff];
        return bytes.map(b => b.toString(16).padStart(2, '0')).join(':');
    }
}
