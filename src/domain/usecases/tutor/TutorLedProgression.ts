/**
 * TutorLedProgression.ts - Domain Use Case
 * 
 * Orchestrates mission generation based on user performance.
 * Dictates mission focus when the user is stalling or making mistakes.
 * 
 * Pillar: THE MASTER'S TOOL (Combinatorial Grammar)
 * Pillar: THE STORYTELLER'S CODE (Pedagogical Intent)
 */

import { CombinatorialFactory } from '../mission/CombinatorialFactory';
import { MasteryTracker } from '../../services/tutor/MasteryTracker';
import { MissionMotive, MissionVerb, MissionNoun } from '../../entities/mission/Grammar';
import { Mission } from '../../entities/Mission';

export class TutorLedProgression {
    constructor(
        private factory: CombinatorialFactory,
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
        // Map problematic utility back to a suitable verb
        const verbMap: Record<string, MissionVerb> = {
            'grep': MissionVerb.EXTRACT,
            'sed': MissionVerb.SORT, // Simplified
            'awk': MissionVerb.COUNT,
            'ls': MissionVerb.VERIFY,
            'mkdir': MissionVerb.APPEND
        };

        const forcedVerb = verbMap[utility] || MissionVerb.EXTRACT;

        return this.factory.createMission({
            motive: MissionMotive.EMERGENCY_RECOVERY, // Semantic choice for "forced"
            verb: forcedVerb,
            noun: this.randomEnum(MissionNoun),
            targetSystem
        });
    }

    private generateRandomMission(targetSystem: string): Mission {
        return this.factory.createMission({
            motive: this.randomEnum(MissionMotive),
            verb: this.randomEnum(MissionVerb),
            noun: this.randomEnum(MissionNoun),
            targetSystem
        });
    }

    private randomEnum<T>(anEnum: T): T[keyof T] {
        const values = Object.values(anEnum as any) as unknown as T[keyof T][];
        return values[Math.floor(Math.random() * values.length)];
    }
}
