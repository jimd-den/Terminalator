/**
 * MissionService - Domain Service
 * 
 * Manages the lifecycle and state transitions of game missions.
 * Responsible for tracking active missions and delegating progression analysis.
 * Upgraded to support Combinatorial Scaling.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Storyteller’s Code (Literate Documentation)
 * Pillar: THE MASTER'S TOOL (Combinatorial Factory)
 */

import { Mission, MissionStep } from '../entities/Mission';
import { NPC } from '../entities/NPC';
import { TerminalState } from '../entities/TerminalState';
import { CommandResponse } from '../entities/Command';
import { TutorService, TutorProgressionResult } from './TutorService';
import { MissionRepository } from './MissionRepository';
import { SimulationBus, GameEventType } from './SimulationBus';
import { generateHostname } from '../utils/NameGenerator';
import { IWorldStateProvider } from '../interfaces/IWorldStateProvider';
import { OrganizationGenerator } from './generation/OrganizationGenerator';
import { MissionPopulator } from './MissionPopulator';

// Scaling Engine
import { TutorLedProgression } from '../usecases/tutor/TutorLedProgression';
import { AdaptiveTutorEngine } from './tutor/AdaptiveTutorEngine';
import { TutorIntent } from '../entities/tutor/TutorIntent';
import { TutorToneProfile } from '../entities/tutor/TutorToneProfile';
import { UnixKnowledgeBase } from './knowledge/UnixKnowledgeBase';

export class MissionService {
    private activeMissions: Mission[] = [];
    private organizationGenerator = new OrganizationGenerator();
    private adaptiveEngine: AdaptiveTutorEngine;

    constructor(
        private tutorService: TutorService,
        private bus: SimulationBus,
        private worldState?: IWorldStateProvider,
        private missionPopulator?: MissionPopulator,
        private tutorProgression?: TutorLedProgression
    ) { 
        this.adaptiveEngine = new AdaptiveTutorEngine(new UnixKnowledgeBase());
    }

    /**
     * Creates a new mission assigned by the given NPC.
     * @param npc - The NPC assigning the mission.
     */
    public async createMission(npc: NPC): Promise<Mission> {
        // Unify: All missions are now generative.
        // Single Source of Truth: TutorLedProgression -> CombinatorialFactory -> MissionGrammar
        const targetSystem = generateHostname(npc.faction || 'corporate');
        const mission = await this.tutorProgression!.generateNextMission(targetSystem);
        
        // Enrich with NPC specific metadata
        mission.assignedBy = npc.id;
        mission.assignerName = npc.name;
        
        this.setupMissionChat(mission, npc);
        this.activeMissions.push(mission);

        this.bus.emit(GameEventType.MISSION_PROGRESS, {
            missionId: mission.id,
            status: mission.status,
            type: 'CREATED'
        });

        return mission;
    }

    private setupMissionChat(mission: Mission, npc: NPC) {
        // Determine Tone based on NPC faction/role (Simplistic mapping for now)
        const tone = npc.faction === 'resistance' ? TutorToneProfile.RESISTANCE_LEADER : TutorToneProfile.CORPORATE_DRONE;

        const briefing = this.adaptiveEngine.generateAdvice(
            TutorIntent.MISSION_BRIEFING,
            tone,
            mission
        );

        const connectionMsg = this.adaptiveEngine.generateAdvice(
            TutorIntent.SYSTEM_CONNECTING,
            TutorToneProfile.SYSTEM_CORE,
            mission
        );

        const rewardMsg = this.adaptiveEngine.generateAdvice(
            TutorIntent.SYSTEM_REWARD_ESCROW,
            TutorToneProfile.SYSTEM_CORE,
            mission
        );

        mission.chatHistory = [
            { sender: 'SYSTEM', message: connectionMsg.message, timestamp: Date.now() },
            { sender: npc.name, message: briefing.message, timestamp: Date.now() },
            { sender: 'SYSTEM', message: rewardMsg.message, timestamp: Date.now() },
        ];
    }

    /**
     * Updates mission state based on command execution results.
     */
    public updateMissions(state: TerminalState, response: CommandResponse): { hints: any[], progression: { result: TutorProgressionResult | null, missionId: string } | null } {
        const hints: any[] = [];
        const progression = this.tutorService.checkMissionProgression(state, this.activeMissions, response);

        if (progression && progression.result) {
            this.bus.emit(GameEventType.MISSION_PROGRESS, {
                missionId: progression.missionId,
                result: progression.result,
                type: progression.result.type === 'MISSION_COMPLETE' ? 'COMPLETED' : 'PROGRESSION'
            });

            const mission = this.activeMissions.find(m => m.id === progression.missionId);
            if (mission) {
                if (progression.result.type === 'MISSION_COMPLETE') {
                    mission.status = 'completed';
                    mission.currentStep = MissionStep.COMPLETED;
                } else if (progression.result.nextStep) {
                    mission.currentStep = progression.result.nextStep;
                }
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