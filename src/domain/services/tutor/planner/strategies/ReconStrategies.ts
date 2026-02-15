/**
 * ReconStrategies.ts - Domain Service
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * Reconnaissance Action Strategies
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { ICommandStrategy } from '../ICommandStrategy';
import { PlannerState } from '../IPlannerAction';
import { KnowledgeType } from '../../../../entities/knowledge/KnowledgeEntity';
import { TutorKnowledgeBase } from '../../../../entities/knowledge/TutorKnowledgeBase';

/**
 * Strategy to discover active IPs on the network.
 */
export class NetworkScanStrategy implements ICommandStrategy {
    public readonly name = "NetworkScan";
    public readonly cost = 0; // Basic command (Phase 10 rebalance)

    public isSatisfiedBy(state: PlannerState): boolean {
        // Can run if we have a target host we haven't 'seen' yet, or if we know nothing
        const knowsGoal = state.targetHost && state.knownValues.has(state.targetHost);
        const hasId = state.knownTypes.has(KnowledgeType.IP) || state.knownTypes.has(KnowledgeType.HOSTNAME);
        const satisfied = (state.targetHost && !knowsGoal) || !hasId;
        console.log(`[NetworkScanStrategy] isSatisfied: ${satisfied}. knowsGoal: ${knowsGoal}, hasId: ${hasId}`);
        return satisfied;
    }

    public applyEffects(state: PlannerState): PlannerState {
        const nextTypes = new Set(state.knownTypes);
        const nextValues = new Set(state.knownValues);
        nextTypes.add(KnowledgeType.IP);
        nextTypes.add(KnowledgeType.HOSTNAME);
        if (state.targetHost) nextValues.add(state.targetHost); // Assume discovery finds the target
        return {
            ...state,
            knownTypes: nextTypes,
            knownValues: nextValues,
            currentHost: state.currentHost
        };
    }

    public generateCommand(kb: TutorKnowledgeBase, goalHost?: string): string {
        return "net-scan";
    }
}

/**
 * Strategy to find specific files once a system is accessible.
 */
export class FindFileStrategy implements ICommandStrategy {
    public readonly name = "FindFile";
    public readonly cost = 0; // Basic command

    public isSatisfiedBy(state: PlannerState): boolean {
        const hasMeta = state.knownTypes.has(KnowledgeType.METADATA);
        const notLocal = state.currentHost !== 'terminalator';
        const satisfied = hasMeta && notLocal;
        console.log(`[FindFileStrategy] isSatisfied: ${satisfied}. hasMeta: ${hasMeta}, notLocal: ${notLocal}, currentHost: ${state.currentHost}`);
        return satisfied;
    }

    public applyEffects(state: PlannerState): PlannerState {
        const nextTypes = new Set(state.knownTypes);
        nextTypes.add(KnowledgeType.PATH);
        return {
            ...state,
            knownTypes: nextTypes,
            currentHost: state.currentHost
        };
    }

    public generateCommand(kb: TutorKnowledgeBase, goalHost?: string): string {
        return "ls -R /";
    }
}

/**
 * Strategy to connect to a remote host.
 */
export class SSHStrategy implements ICommandStrategy {
    public readonly name = "SSH";
    public readonly cost = 0; // Basic command

    public isSatisfiedBy(state: PlannerState): boolean {
        const types = Array.from(state.knownTypes);
        const hasId = state.knownTypes.has(KnowledgeType.IP) || state.knownTypes.has(KnowledgeType.HOSTNAME);
        // We can SSH if we are NOT already on a remote host
        const satisfied = hasId && state.currentHost === 'terminalator';
        console.log(`[SSHStrategy] isSatisfied: ${satisfied}. Types: [${types.join(',')}]. hasId: ${hasId}, currentHost: ${state.currentHost}`);
        return satisfied;
    }

    public applyEffects(state: PlannerState): PlannerState {
        const nextTypes = new Set(state.knownTypes);
        nextTypes.add(KnowledgeType.METADATA);
        return {
            ...state,
            knownTypes: nextTypes,
            currentHost: state.targetHost || 'any' // Success: We are now on the target host (if known)
        };
    }

    public generateCommand(kb: TutorKnowledgeBase, goalHost?: string): string {
        const hostnames = kb.recall(KnowledgeType.HOSTNAME);
        if (hostnames.length > 0) {
            let target = hostnames[hostnames.length - 1].value;
            if (goalHost && hostnames.some(h => h.value === goalHost)) {
                target = goalHost;
            }
            return `net-link admin@${target}`;
        }
        const ips = kb.recall(KnowledgeType.IP);
        const target = ips.length > 0 ? ips[ips.length - 1].value : "10.0.0.1";
        return `net-link admin@${target}`;
    }
}
