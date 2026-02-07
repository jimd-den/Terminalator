/**
 * ConstraintSolver.ts
 *
 * Pillar: THE MASTER'S TOOL (Automated Reasoning)
 * Pillar: THE FOUR-FOLD SHIELD (Clean Architecture) - Domain Service
 *
 * Intent:
 * The brain of the mission generator. It takes a high-level Goal (e.g., "Read a hidden file")
 * and decomposes it into a chain of atomic steps based on tool capabilities.
 */

import { UnixKnowledgeBase } from './UnixKnowledgeBase';
import { CommandCapability } from '../../entities/knowledge/UnixCommandDefinition';

export interface SolvedStep {
    tool: string;
    flags: string[];
    reasoning: string; // "ls -a is required because the file is HIDDEN"
}

export class ConstraintSolver {
    constructor(private kb: UnixKnowledgeBase) {}

    /**
     * Decomposes a complex goal into a tool chain.
     */
    public solveChain(capabilities: CommandCapability[], constraints: string[]): SolvedStep[] {
        const steps: SolvedStep[] = [];

        // Simple linear solver for Phase 2:
        // For each capability, find the best tool that satisfies as many constraints as possible.
        
        for (const cap of capabilities) {
            const tools = this.kb.findTools(cap);
            if (tools.length === 0) continue;

            // Simple heuristic: Pick tool that supports the most requested constraints
            // In a real solver, this would be a graph search (A*)
            let bestTool = tools[0];
            let bestMatchCount = -1;
            let bestFlags: string[] = [];

            for (const tool of tools) {
                const applicableFlags = tool.flags.filter(f => constraints.includes(f.effect));
                if (applicableFlags.length > bestMatchCount) {
                    bestMatchCount = applicableFlags.length;
                    bestTool = tool;
                    bestFlags = applicableFlags.map(f => f.name);
                }
            }

            steps.push({
                tool: bestTool.name,
                flags: bestFlags,
                reasoning: `Selected ${bestTool.name} to satisfy ${cap} with constraints: [${constraints.join(', ')}]`
            });
        }

        return steps;
    }
}
