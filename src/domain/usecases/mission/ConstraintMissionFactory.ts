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
            reward: '2500 Credits',
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
        
        // 1. Connect
        steps.push({
            id: 'step1',
            stepType: 'CONNECT',
            description: `Connect to ${problem.targetSystem}`,
            tutorIntent: 'INSTRUCT_SSH',
            lessonText: `ssh admin@${problem.targetSystem}`,
            commandMatcher: { type: GameEventType.COMMAND_EXECUTED, target: 'ssh', ruleKey: 'SUCCESS_EXIT' },
            onComplete: { nextStepId: 'step2', tutorIntent: 'LINK_ESTABLISHED' }
        });

        // 2. Navigate
        steps.push({
            id: 'step2',
            stepType: 'LOCATE',
            description: `Navigate to /var/data`,
            tutorIntent: 'INSTRUCT_CD',
            lessonText: `cd /var/data`,
            commandMatcher: { type: GameEventType.COMMAND_EXECUTED, target: 'cd', ruleKey: 'DIR_MATCH' },
            onComplete: { nextStepId: 'step3', tutorIntent: 'FILE_LOCATED' }
        });

        // 3. Chain Execution (Simplification: Chain mapped to sequential or piped commands)
        // For Phase 2, we just take the last step as the "Action"
        const lastStep = chain[chain.length - 1];
        const flagStr = lastStep.flags.join(' ');
        const cmdString = `${lastStep.tool} ${flagStr} target`.trim();

        steps.push({
            id: 'step3',
            stepType: 'MODIFY', // Generic action
            description: `Execute: ${cmdString}`,
            tutorIntent: 'INSTRUCT_ACTION',
            lessonText: cmdString,
            cwdPattern: '/var/data',
            commandMatcher: {
                type: GameEventType.COMMAND_EXECUTED,
                target: lastStep.tool,
                ruleKey: 'SUCCESS_EXIT'
            },
            onComplete: { tutorIntent: 'MISSION_ACCOMPLISHED' }
        });

        return {
            archetype: 'CONSTRAINT_SOLVER',
            initialStepId: 'step1',
            steps
        };
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
            requiredDirs: ['/home/admin', '/var/data'],
            files: [
                {
                    path: '/var/data/target',
                    rawContent: `TARGET DATA FOR ${problem.objective}`,
                    mode: 0o644
                }
            ],
            logs: []
        };
    }
}
