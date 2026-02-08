/**
 * TutorLedProgression.ts - Domain Use Case
 * 
 * Orchestrates mission generation based on user performance.
 * Dictates mission focus when the user is stalling or making mistakes.
 * 
 * Pillar: THE MASTER'S TOOL (Combinatorial Grammar)
 * Pillar: THE STORYTELLER'S CODE (Pedagogical Intent)
 */

import { ConstraintMissionFactory, ProblemDefinition } from '../mission/ConstraintMissionFactory';
import { MasteryTracker } from '../../services/tutor/MasteryTracker';
import { CommandCapability } from '../../entities/knowledge/UnixCommandDefinition';
import { Mission } from '../../entities/Mission';
import { SystemPreparationSpec } from '../../entities/world/SystemPreparationSpec';

export class TutorLedProgression {
    constructor(
        private factory: ConstraintMissionFactory,
        private masteryTracker: MasteryTracker
    ) {}

    /**
     * Recommends a mission that addresses the user's current weaknesses.
     */
    public async generateNextMission(targetSystem: string): Promise<Mission> {
        // 1. Identify most problematic utility (highest fail count)
        // In a real system, we'd iterate over all registered utilities.
        // Here, we'll check common ones.
        const focusTools = ['grep', 'sed', 'awk', 'ls', 'cd', 'mkdir'];
        let mostFailed = '';
        let maxFails = 0;

        for (const tool of focusTools) {
            const fails = this.masteryTracker.getFailCount(tool);
            if (fails > maxFails) {
                maxFails = fails;
                mostFailed = tool;
            }
        }

        // 2. If a problematic tool is found (> 2 fails), force a mission for it
        if (mostFailed && maxFails > 2) {
            return this.generateForcedMission(mostFailed, targetSystem);
        }

        // 3. Otherwise, proceed with default factory logic (random grammar selection)
        return this.generateRandomMission(targetSystem);
    }

    private generateForcedMission(utility: string, targetSystem: string): Mission {
        // Map problematic utility to semantic capabilities
        const capMap: Record<string, CommandCapability[]> = {
            'grep': [CommandCapability.SEARCH],
            'sed': [CommandCapability.TRANSFORM],
            'awk': [CommandCapability.FILTER, CommandCapability.TRANSFORM],
            'ls': [CommandCapability.LIST],
            'mkdir': [CommandCapability.MODIFY]
        };

        const capabilities = capMap[utility] || [CommandCapability.READ];
        const constraints = Math.random() > 0.5 ? ['RECURSIVE'] : [];

        const problem: ProblemDefinition = {
            objective: `Solve system anomaly using ${utility.toUpperCase()}`,
            capabilities,
            constraints,
            targetSystem
        };

        return this.factory.createMission(problem);
    }

    private generateRandomMission(targetSystem: string): Mission {
        const capabilitiesPool = [
            [CommandCapability.SEARCH],
            [CommandCapability.LIST],
            [CommandCapability.MODIFY],
            [CommandCapability.TRANSFORM],
            [CommandCapability.READ]
        ];

        const constraintsPool = ['RECURSIVE', 'DETAILS', 'SHOW_HIDDEN', 'FORCE'];

        const problem: ProblemDefinition = {
            objective: "Perform randomized tactical data maneuver",
            capabilities: capabilitiesPool[Math.floor(Math.random() * capabilitiesPool.length)],
            constraints: [constraintsPool[Math.floor(Math.random() * constraintsPool.length)]],
            targetSystem
        };

        return this.factory.createMission(problem);
    }
}
