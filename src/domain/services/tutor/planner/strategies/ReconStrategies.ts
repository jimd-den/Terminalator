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
            knownTypes: nextTypes
        };
    }

    public generateCommand(kb: TutorKnowledgeBase): string {
        // In a real scenario, this might pull the current subnet from the KB
        return "nmap -sn 10.0.0.0/24";
    }
}

/**
 * Strategy to find specific files once a system is accessible.
 */
export class FindFileStrategy implements ICommandStrategy {
    public readonly name = "FindFile";
    public readonly cost = 5;

    public isSatisfiedBy(state: PlannerState): boolean {
        return state.knownTypes.has(KnowledgeType.IP);
    }

    public applyEffects(state: PlannerState): PlannerState {
        const nextTypes = new Set(state.knownTypes);
        nextTypes.add(KnowledgeType.PATH);
        return {
            ...state,
            knownTypes: nextTypes
        };
    }

    public generateCommand(kb: TutorKnowledgeBase): string {
        // Potential heuristic: search for common sensitive filenames
        return "find / -name '*.log' -o -name '*.txt' 2>/dev/null";
    }
}
