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
    public readonly cost = 10;

    public isSatisfiedBy(state: PlannerState): boolean {
        // Initial action, always satisfied
        return true;
    }

    public applyEffects(state: PlannerState): PlannerState {
        const nextTypes = new Set(state.knownTypes);
        nextTypes.add(KnowledgeType.IP);
        return {
            ...state,
            knownTypes: nextTypes,
            currentHost: state.currentHost
        };
    }

    public generateCommand(kb: TutorKnowledgeBase): string {
        // In a real scenario, this might pull the current subnet from the KB
        return "net-scan";
    }
}

/**
 * Strategy to find specific files once a system is accessible.
 */
export class FindFileStrategy implements ICommandStrategy {
    public readonly name = "FindFile";
    public readonly cost = 5;

    public isSatisfiedBy(state: PlannerState): boolean {
        return state.knownTypes.has(KnowledgeType.METADATA);
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

    public generateCommand(kb: TutorKnowledgeBase): string {
        // Potential heuristic: search for common sensitive filenames
        return "find / -name '*.log' -o -name '*.txt' 2>/dev/null";
    }
}

/**
 * Strategy to connect to a remote host.
 */
export class SSHStrategy implements ICommandStrategy {
    public readonly name = "SSH";
    public readonly cost = 2;

    public isSatisfiedBy(state: PlannerState): boolean {
        // Need an IP or Hostname to SSH into
        return state.knownTypes.has(KnowledgeType.IP) || state.knownTypes.has(KnowledgeType.HOSTNAME);
    }

    public applyEffects(state: PlannerState): PlannerState {
        // Effectively "refreshes" knowledge potential on a new node
        // In the planner, we might represent this as gaining access to a new scope
        const nextTypes = new Set(state.knownTypes);
        nextTypes.add(KnowledgeType.METADATA); // "Connected" state
        return {
            ...state,
            knownTypes: nextTypes,
            currentHost: state.currentHost
        };
    }

    public generateCommand(kb: TutorKnowledgeBase): string {
        const hostnames = kb.recall(KnowledgeType.HOSTNAME);
        if (hostnames.length > 0) {
            return `net-link admin@${hostnames[hostnames.length - 1].value}`;
        }

        const ips = kb.recall(KnowledgeType.IP);
        // Find an IP we haven't connected to yet or just pick the latest
        const target = ips.length > 0 ? ips[ips.length - 1].value : "10.0.0.1";
        return `net-link admin@${target}`;
    }
}
