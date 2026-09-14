/**
 * NetScanCommand.ts - Core Command
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * Lattice Node Scanner (net-scan)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * The core exploration verb. It used to print `networkMap.getAllHosts()` -- the
 * hosts already booted -- with a `Math.random()` latency column, so it showed
 * the same three machines every run and disagreed with itself between scans.
 *
 * It now *derives* neighbours from the lattice at the scanned coordinate. Every
 * scan can turn up somewhere new, latency is a property of the link rather than
 * a die roll, and two scans of the same place from the same seed agree exactly.
 *
 * Usage:
 *   net-scan                 scan outward from the current host
 *   net-scan <host|addr>     scan from somewhere else
 *   net-scan -d <n>          expansion radius (default 2, max 4)
 *   net-scan -k              known hosts only; derive nothing new
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { CommandBase } from '../CommandBase';
import { CommandCapability } from '../IStructuredCommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../entities/Command';
import { NodeType } from '../../entities/world/Lattice';

const MAX_RADIUS = 4;

/** Fixed-width columns keep the scan readable on a narrow phone terminal. */
const pad = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s.padEnd(n));

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
        if (!context.networkMap) {
            return { output: 'net-scan: network service unavailable', exitCode: 1, newState: state };
        }

        const map = context.networkMap;
        const origin = operands[0] ?? state.fsContext ?? 'localhost';

        // -d takes its value from the operand that follows it.
        let radius = 2;
        const dIndex = rawArgs.findIndex(a => a === '-d' || a === '--depth');
        if (dIndex >= 0 && rawArgs[dIndex + 1]) {
            const parsed = parseInt(rawArgs[dIndex + 1], 10);
            if (!Number.isNaN(parsed)) radius = Math.max(1, Math.min(MAX_RADIUS, parsed));
        }

        const knownOnly = flags.has('k');

        if (knownOnly) {
            const hosts = map.getAllHosts();
            const lines = [
                `Known hosts (${hosts.length}):`,
                ...hosts.map(h => `  ${h}`)
            ];
            return { output: lines.join('\n'), exitCode: 0, newState: state };
        }

        const found = map.discover(origin, radius);

        if (found.length === 0) {
            return {
                output: `net-scan: no route from '${origin}'.\nScan from a host you are linked to, or give a lattice address (e.g. 10.4.7.1).`,
                exitCode: 1,
                newState: state
            };
        }

        // Nearest first, so the reachable next hop is always at the top.
        const sorted = [...found].sort((a, b) => a.latency - b.latency);
        const localCount = sorted.filter(d => !d.external).length;

        const lines: string[] = [
            `Scanning lattice from ${origin} (radius ${radius})...`,
            '',
            `  ${pad('HOST', 24)}${pad('ADDRESS', 18)}${pad('TYPE', 12)}${pad('SEC', 5)}${pad('LAT', 7)}LINK`,
            `  ${'─'.repeat(72)}`
        ];

        for (const d of sorted) {
            const n = d.node;
            const vendor = n.components.isVendor ? ' *VENDOR*' : '';
            lines.push(
                `  ${pad(n.hostname, 24)}${pad(n.ip, 18)}${pad(this.shortType(n.type), 12)}` +
                `${pad(String(n.components.securityLevel), 5)}${pad(`${d.latency}ms`, 7)}` +
                `${d.external ? 'UPLINK' : 'local'}${vendor}`
            );
        }

        const externals = sorted.length - localCount;
        lines.push('');
        lines.push(`${sorted.length} nodes reachable — ${localCount} local, ${externals} via uplink.`);
        if (externals > 0) {
            lines.push(`Uplinks lead to unmapped subnets. net-link an uplink, then scan again.`);
        }

        return { output: lines.join('\n'), exitCode: 0, newState: state };
    }

    private shortType(type: NodeType): string {
        switch (type) {
            case NodeType.ROUTER: return 'GATEWAY';
            case NodeType.SERVER: return 'SERVER';
            case NodeType.WORKSTATION: return 'WORKSTN';
            case NodeType.MAINFRAME: return 'MAINFRAME';
            case NodeType.IOT_DEVICE: return 'IOT';
            default: return 'NODE';
        }
    }
}
