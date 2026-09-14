/**
 * GenCommand.ts - Core Command
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * World Generation Inspector (gen)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * A diegetic window onto the lattice. Procedural worlds are usually opaque --
 * the player has no way to tell a vast generated space from a small scripted
 * one, which is precisely how an "infinite" world ends up feeling finite. This
 * command makes the generator legible: you can read the seed, derive any
 * coordinate in existence without travelling to it, and watch the reachable
 * frontier refuse to close.
 *
 * Usage:
 *   gen                       summary of the current universe
 *   gen seed                  the world seed (share it to reproduce this world)
 *   gen node <host|addr>      derive one coordinate
 *   gen expand <host> [r]     derive the neighbourhood of a coordinate
 *   gen probe [n]             walk n hops outward and report what was found
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { CommandBase } from '../CommandBase';
import { CommandCapability } from '../IStructuredCommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../entities/Command';

const MAX_PROBE = 2000;

export class GenCommand extends CommandBase {
    public readonly capabilities = [CommandCapability.LIST];
    public readonly utility = 'gen';

    protected async executeInternal(
        rawArgs: string[],
        flags: Set<string>,
        operands: string[],
        context: ProcessContext,
        state: TerminalState
    ): Promise<CommandResponse> {
        const map = context.networkMap;
        const universe = map?.getUniverse();

        if (!map || !universe) {
            return { output: 'gen: no universe bound to this session', exitCode: 1, newState: state };
        }

        const sub = (operands[0] ?? 'info').toLowerCase();
        const here = state.fsContext ?? 'localhost';

        switch (sub) {
            case 'seed':
                return this.ok(
                    [
                        `SEED: ${universe.getSeed()}`,
                        `Every node, faction and filesystem in this world is derived from that`,
                        `string. Same seed, same universe — anywhere, forever.`
                    ].join('\n'),
                    state
                );

            case 'node': {
                const target = operands[1] ?? here;
                const node = universe.getNodeDetails(target);
                if (!node) {
                    return this.fail(`gen: '${target}' does not resolve. Undiscovered hostnames need a net-scan; addresses always resolve.`, state);
                }
                const c = node.components;
                return this.ok([
                    `${node.hostname}  [${node.ip}]`,
                    `  type        ${node.type}`,
                    `  os          ${c.osType}`,
                    `  security    ${c.securityLevel}/10`,
                    `  cpu         ${c.cpuPower} cyc`,
                    `  faction     ${node.factionId}`,
                    ...(c.isVendor ? [`  vendor      ${(c.inventory ?? []).join(', ')}`] : []),
                    `  discovered  ${map.isDiscovered(node.hostname) ? 'yes' : 'no'}`
                ].join('\n'), state);
            }

            case 'expand': {
                const target = operands[1] ?? here;
                const radius = Math.max(1, Math.min(4, parseInt(operands[2] ?? '1', 10) || 1));
                const found = universe.expand(target, radius);
                if (found.length === 0) {
                    return this.fail(`gen: nothing reachable from '${target}'`, state);
                }
                const lines = found
                    .sort((a, b) => a.latency - b.latency)
                    .map(d => `  ${d.external ? '↗' : '·'} ${d.node.hostname.padEnd(24)} ${d.node.ip.padEnd(18)} ${d.latency}ms`);
                return this.ok(
                    [`Neighbourhood of ${target} (radius ${radius}): ${found.length} nodes`, ...lines].join('\n'),
                    state
                );
            }

            case 'probe': {
                const budget = Math.max(1, Math.min(MAX_PROBE, parseInt(operands[1] ?? '250', 10) || 250));
                return this.ok(this.probe(universe, here, budget), state);
            }

            default: {
                const home = universe.deriveHome();
                return this.ok([
                    `UNIVERSE`,
                    `  seed       ${universe.getSeed()}`,
                    `  home       ${home.hostname} [${home.ip}]`,
                    `  standing   ${here}`,
                    `  discovered ${map.getAllHosts().length} host(s)`,
                    ``,
                    `The lattice is derived, not stored: nodes exist because their`,
                    `coordinate exists, so there is no total to count. Try 'gen probe'.`,
                    ``,
                    `  gen seed | gen node <host> | gen expand <host> [r] | gen probe [n]`
                ].join('\n'), state);
            }
        }
    }

    /**
     * Walks outward and reports what it found. The point of this is falsifiable:
     * if the world were secretly finite, the walk would run out of new nodes and
     * the frontier would collapse to zero. It does not.
     */
    private probe(universe: NonNullable<ReturnType<NonNullable<ProcessContext['networkMap']>['getUniverse']>>, from: string, budget: number): string {
        const seen = new Set<string>();
        const sectors = new Set<number>();
        let frontier: string[] = [from];
        let hops = 0;
        let steps = 0;

        while (frontier.length > 0 && steps < budget) {
            const next: string[] = [];
            for (const host of frontier) {
                if (steps >= budget) break;
                steps++;
                for (const d of universe.expand(host, 1)) {
                    const sector = d.node.ip.includes(':') ? Number(d.node.ip.split(':')[0]) : 0;
                    sectors.add(sector);
                    if (seen.has(d.node.ip)) continue;
                    seen.add(d.node.ip);
                    next.push(d.node.ip);
                }
            }
            frontier = next;
            hops++;
        }

        return [
            `Probing lattice from ${from}...`,
            ``,
            `  hops expanded    ${hops}`,
            `  nodes derived    ${seen.size}`,
            `  sectors touched  ${sectors.size}`,
            `  frontier open    ${frontier.length} node(s) still unexplored`,
            ``,
            frontier.length > 0
                ? `Frontier did not close. Raise the budget and it still will not.`
                : `Budget exhausted the local pocket — scan an uplink to continue.`
        ].join('\n');
    }

    private ok(output: string, newState: TerminalState): CommandResponse {
        return { output, exitCode: 0, newState };
    }

    private fail(output: string, newState: TerminalState): CommandResponse {
        return { output, exitCode: 1, newState };
    }
}
