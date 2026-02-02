/**
 * MissionService - Domain Service
 * 
 * Manages the lifecycle and state transitions of game missions.
 * Responsible for tracking active missions and delegating progression analysis.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Storyteller’s Code (Literate Documentation)
 * Pillar: The Balanced Scale (SOLID) - Decouples mission state from UI logic.
 */

import { Mission, MissionGenerator, MissionStep } from '../entities/Mission';
import { NPC } from '../entities/NPC';
import { TerminalState } from '../entities/TerminalState';
import { CommandResponse } from '../entities/Command';
import { analyzeGameState, checkMissionProgression, TutorProgressionResult } from './TutorService';

export class MissionService {
    private activeMissions: Mission[] = [];

    /**
     * Creates a new mission assigned by the given NPC.
     * @param npc - The NPC assigning the mission.
     */
    public createMission(npc: NPC): Mission {
        const mission = MissionGenerator.generate(npc);

        // Setup initial chat history
        mission.chatHistory = [
            { sender: 'SYSTEM', message: `CONNECTING TO SECURE CHANNEL ${mission.id}...`, timestamp: Date.now() },
            { sender: npc.name, message: `Operator, I require assistance with a ${mission.type} operation.`, timestamp: Date.now() },
            { sender: npc.name, message: mission.description, timestamp: Date.now() },
            { sender: 'SYSTEM', message: `REWARD ESCROW: ${mission.reward}`, timestamp: Date.now() },
        ];

        this.activeMissions.push(mission);
        return mission;
    }

    /**
     * Updates mission state based on command execution results.
     * Returns hints or progression triggers.
     */
    public updateMissions(state: TerminalState, response: CommandResponse): { hints: { missionId: string, sender: string, message: string, type: string }[], progression: { result: TutorProgressionResult | null, missionId: string } | null } {
        const hints: { missionId: string, sender: string, message: string, type: string }[] = [];
        const progression = checkMissionProgression(state, this.activeMissions, undefined, response);

        for (const mission of this.activeMissions) {
            const hint = analyzeGameState(mission, state, response);
            if (hint) {
                const alreadySent = mission.chatHistory.some(m => m.message === hint.message);
                if (!alreadySent) {
                    const sender = hint.type === 'CONGRATS' ? 'SYSTEM' : 'TutorBot';

                    mission.chatHistory.push({
                        sender,
                        message: hint.message,
                        timestamp: Date.now()
                    });

                    if (hint.type === 'CONGRATS') {
                        mission.status = 'completed';
                        mission.currentStep = MissionStep.COMPLETED;
                    }

                    hints.push({ missionId: mission.id, sender, message: hint.message, type: hint.type });
                }
            }
        }

        // Apply progression state changes if any
        if (progression && progression.result && progression.result.nextStep) {
            const mission = this.activeMissions.find(m => m.id === progression.missionId);
            if (mission) {
                mission.currentStep = progression.result.nextStep;
            }
        }

        return { hints, progression };
    }

    public getActiveMissions(): Mission[] {
        return [...this.activeMissions];
    }

    public getMissionById(id: string): Mission | undefined {
        return this.activeMissions.find(m => m.id === id);
    }

    public abandonMission(id: string): void {
        this.activeMissions = this.activeMissions.filter(m => m.id !== id);
    }
}
