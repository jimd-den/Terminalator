/**
 * WorldVerifier.ts - Domain Service
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * The Solvability Proof (Tutor as Verifier)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Uses the GOAP Planner to prove that there is a path from a Start Node
 * to an Objective Node using only the information available in text
 * artifacts (Hyperlinks) and available tools.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { GOAPPlanner } from '../../tutor/planner/GOAPPlanner';
import { NetworkTopology } from '../../../entities/world/Lattice';
import { ICommandStrategy } from '../../tutor/planner/ICommandStrategy';
import { KnowledgeType } from '../../../entities/knowledge/KnowledgeEntity';
import { NetworkScanStrategy, FindFileStrategy } from '../../tutor/planner/strategies/ReconStrategies';
import { ReadFileStrategy, GrepContentStrategy } from '../../tutor/planner/strategies/ExfilStrategies';
import { AutoPwnStrategy } from '../../tutor/planner/strategies/ExploitStrategies';

export class WorldVerifier {
    private planner = new GOAPPlanner();
    private strategies: ICommandStrategy[] = [
        new NetworkScanStrategy(),
        new FindFileStrategy(),
        new ReadFileStrategy(),
        new GrepContentStrategy(),
        new AutoPwnStrategy()
    ];

    /**
     * Verifies that a goal is reachable in the given topology.
     */
    public verify(topology: NetworkTopology, goalType: KnowledgeType): boolean {
        const start = {
            knownTypes: new Set<KnowledgeType>(),
            knownValues: new Set<string>(),
            knownTools: new Set<string>(['autopwn.sh']), // Assume tools for verification
            currentHost: 'terminalator'
        };

        const goal = {
            knownTypes: new Set([goalType]),
            knownValues: new Set<string>(),
            knownTools: new Set<string>(),
            currentHost: 'any'
        };

        const plan = this.planner.plan(start, goal, this.strategies);
        return plan !== null && plan.length > 0;
    }
}
