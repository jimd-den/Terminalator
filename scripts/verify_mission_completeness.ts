/**
 * verify_mission_completeness.ts
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * Integration Test for World Solvability
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { WorldGenerator } from "../src/domain/services/generation/WorldGenerator";
import { GOAPPlanner } from "../src/domain/services/tutor/planner/GOAPPlanner";
import { ICommandStrategy } from "../src/domain/services/tutor/planner/ICommandStrategy";
import { NetworkScanStrategy, FindFileStrategy, SSHStrategy } from "../src/domain/services/tutor/planner/strategies/ReconStrategies";
import { ReadFileStrategy, GrepContentStrategy } from "../src/domain/services/tutor/planner/strategies/ExfilStrategies";
import { BypassStrategy } from "../src/domain/services/tutor/planner/strategies/ExploitStrategies";
import { KnowledgeType } from "../src/domain/entities/knowledge/KnowledgeEntity";

async function verifyCompleteness() {
    console.log("Testing Procedural World Completeness...");
    
    const generator = new WorldGenerator();
    const planner = new GOAPPlanner();
    const strategies: ICommandStrategy[] = [
        new NetworkScanStrategy(),
        new FindFileStrategy(),
        new SSHStrategy(),
        new ReadFileStrategy(),
        new GrepContentStrategy(),
        new BypassStrategy()
    ];

    const seed = "CompletenessTest_" + Date.now();
    const world = generator.generateWorld(seed);
    console.log(`Generated world with ${world.topology.nodes.length} nodes.`);

    // Goal: Get a CREDENTIAL
    const start = {
        knownTypes: new Set<KnowledgeType>(),
        knownValues: new Set<string>(),
        knownTools: new Set<string>(['bypass.sh']), // Assume we have the tool
        currentHost: 'terminalator'
    };

    const goal = {
        knownTypes: new Set([KnowledgeType.METADATA]),
        knownValues: new Set<string>(),
        knownTools: new Set<string>(),
        currentHost: 'any'
    };

    const plan = planner.plan(start, goal, strategies);

    if (plan && plan.length > 0) {
        console.log("SUCCESS: Planner found a path to the objective.");
        console.log("Plan:", plan.map(s => s.name).join(" -> "));
        
        // Verify commands
        const kb = { recall: () => [{ value: '10.0.0.1' }] } as any;
        plan.forEach(s => {
            const cmd = (s as any).generateCommand(kb);
            console.log(`Strategy ${s.name} -> Command: ${cmd}`);
            if (cmd.includes('nmap') || cmd.includes('ssh') || cmd.includes('bypass')) {
                throw new Error(`Licensed name found in command: ${cmd}`);
            }
        });
    } else {
        console.error("FAILURE: Planner could not find a path in this world.");
        process.exit(1);
    }
}

verifyCompleteness().catch(err => {
    console.error(err);
    process.exit(1);
});
