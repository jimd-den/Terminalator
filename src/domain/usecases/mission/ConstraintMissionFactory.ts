/**
 * ConstraintMissionFactory.ts
 *
 * Pillar: THE MASTER'S TOOL (Constraint Solving)
 * Pillar: THE FOUR-FOLD SHIELD (Clean Architecture) - Domain Use Case
 *
 * Intent:
 * Generates missions by defining a problem (Constraints) and finding a 
 * solution path using the UnixKnowledgeBase.
 * Replaces the static archetypes of CombinatorialFactory.
 */

import { UnixKnowledgeBase } from '../../services/knowledge/UnixKnowledgeBase';
import { ConstraintSolver, SolvedStep } from '../../services/knowledge/ConstraintSolver';
import { CommandCapability } from '../../entities/knowledge/UnixCommandDefinition';
import { Mission, MissionStep } from '../../entities/Mission';
import { MissionGrammar, StepRule } from '../../entities/mission/MissionGrammar';
import { GameEventType } from '../../services/SimulationBus';
import { SystemPreparationSpec } from '../../entities/world/SystemPreparationSpec';
import { WorldPatchService } from '../../services/world/WorldPatchService';

export interface ProblemDefinition {
    objective: string; // e.g. "Find the password"
    capabilities: CommandCapability[]; // e.g. [SEARCH]
    constraints: string[]; // e.g. ["RECURSIVE", "HIDDEN"]
    targetSystem: string;
}

export class ConstraintMissionFactory {
    private solver: ConstraintSolver;

    constructor(
        private kb: UnixKnowledgeBase,
        private worldPatchService: WorldPatchService
    ) {
        this.solver = new ConstraintSolver(kb);
    }

    /**
     * Solves a problem definition to create a Mission.
     */
    public createMission(problem: ProblemDefinition): Mission {
        // 1. Solve: Decompose problem into steps
        const solution = this.solver.solveChain(problem.capabilities, problem.constraints);
        
        if (solution.length === 0) {
            throw new Error(`Unsolvable problem: ${problem.objective}`);
        }

        // 2. Generate Grammar from Solution Chain
        const id = `M-GEN-${Math.floor(Math.random() * 10000)}`;
        const grammar = this.generateGrammarFromChain(id, solution, problem);

        // 3. Generate Prep Spec (World State)
        const prepSpec = this.generatePrepSpec(problem);

        // 4. Apply World Patch (Lens 7: Experience Alignment)
        this.worldPatchService.patch(prepSpec);

        // Primary tool for description
        const primaryTool = solution[solution.length - 1].tool;

        return {
            id,
            type: 'generative',
            targetSystem: problem.targetSystem,
            targetUser: 'admin',
            objectiveTarget: '/var/data/target', 
            description: `MISSION: ${problem.objective}. SOLUTION HINT: Use ${primaryTool}.`,
            reward: '2500 Ƶ',
            rewardValue: 2500,
            status: 'pending',
            currentStep: MissionStep.PENDING,
            currentStepId: grammar.initialStepId,
            grammar,
            assignedBy: 'system',
            assignerName: 'THE GRID',
            chatHistory: [],
            metadata: {
                prepSpec
            }
        };
    }

    private generateGrammarFromChain(id: string, chain: SolvedStep[], problem: ProblemDefinition): MissionGrammar {
        const steps: StepRule[] = [];
        let initialStepId = 'step_0';
        
        // 1. Connection Phase (if remote)
        if (problem.targetSystem !== 'terminalator') {
            initialStepId = 'connect';
            steps.push({
                id: 'connect',
                stepType: 'CONNECT',
                description: `Establish link to ${problem.targetSystem}`,
                tutorIntent: 'INSTRUCT_SSH',
                lessonText: `ssh admin@${problem.targetSystem}`,
                commandMatcher: { type: GameEventType.COMMAND_EXECUTED, target: 'ssh', ruleKey: 'SUCCESS_EXIT' },
                onComplete: { nextStepId: 'step_0', tutorIntent: 'LINK_ESTABLISHED' }
            });
        }

        // 2. Dynamic Chain Mapping
        chain.forEach((step, index) => {
            const isLast = index === chain.length - 1;
            const nextId = isLast ? undefined : `step_${index + 1}`;
            const cmdString = `${step.tool} ${step.flags.join(' ')}`.trim();

            steps.push({
                id: `step_${index}`,
                stepType: this.mapToolToStepType(step.tool),
                description: step.reasoning,
                tutorIntent: isLast ? 'INSTRUCT_ACTION' : 'NUDGE_PROGRESSION',
                lessonText: cmdString,
                commandMatcher: {
                    type: GameEventType.COMMAND_EXECUTED,
                    target: step.tool,
                    ruleKey: 'SUCCESS_EXIT'
                },
                onComplete: { 
                    nextStepId: nextId, 
                    tutorIntent: isLast ? 'MISSION_ACCOMPLISHED' : 'STEP_COMPLETE' 
                }
            });
        });

        return {
            archetype: 'CONSTRAINT_SOLVER',
            initialStepId,
            steps
        };
    }

    private mapToolToStepType(tool: string): any {
        const map: Record<string, string> = {
            'cd': 'LOCATE',
            'ls': 'LIST',
            'grep': 'SEARCH',
            'awk': 'FILTER',
            'sed': 'TRANSFORM',
            'mkdir': 'MODIFY',
            'rm': 'MODIFY',
            'cat': 'READ'
        };
        return map[tool] || 'ACTION';
    }

    private solveFlags(tool: any, constraints: string[]): string[] {
        const flags: string[] = [];
        constraints.forEach(c => {
            const flag = tool.flags.find((f: any) => f.effect === c);
            if (flag) flags.push(flag.name);
        });
        return flags;
    }

    private generatePrepSpec(problem: ProblemDefinition): SystemPreparationSpec {
        return {
            hostname: problem.targetSystem,
            requiredDirs: ['/home/admin', '/var/data', '/public/tools'],
            files: [
                {
                    path: '/var/data/target',
                    rawContent: `TARGET DATA FOR ${problem.objective}`,
                    mode: 0o644
                },
                {
                    path: '/public/tools/bypass.sh',
                    rawContent: '# Vendor binary for bypass.sh',
                    mode: 0o644
                },
                {
                    path: '/public/tools/decrypter.bin',
                    rawContent: '# Vendor binary for decrypter.bin',
                    mode: 0o644
                }
            ],
            logs: []
        };
    }
}
