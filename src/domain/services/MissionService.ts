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

import { Mission, MissionStep } from '../entities/Mission';
import { NPC } from '../entities/NPC';
import { TerminalState } from '../entities/TerminalState';
import { CommandResponse } from '../entities/Command';
import { TutorService, TutorProgressionResult } from './TutorService';
import { MissionRepository } from './MissionRepository';
import { generateHostname, generateObjectiveFilename } from '../utils/NameGenerator';
import { IWorldStateProvider } from '../interfaces/IWorldStateProvider';
import { ProceduralMissionFactory } from '../factories/ProceduralMissionFactory';
import { ConstraintValidator } from './constraints/ConstraintValidator';
import { ComplexityEstimator } from './constraints/ComplexityEstimator';
import { OrganizationGenerator } from './generation/OrganizationGenerator';
import { KnuthianMissionFactory } from '../factories/KnuthianMissionFactory';
import { Organization } from '../entities/world/Organization';
import { MissionPopulator } from './MissionPopulator';

export class MissionService {
    private activeMissions: Mission[] = [];
    private organizationGenerator = new OrganizationGenerator();

    constructor(
        private missionRepository: MissionRepository,
        private tutorService: TutorService,
        private worldState?: IWorldStateProvider,
        private proceduralFactory?: ProceduralMissionFactory,
        private constraintValidator?: ConstraintValidator,
        private knuthianFactory?: KnuthianMissionFactory,
        private missionPopulator?: MissionPopulator
    ) { }

    /**
     * Creates a new mission assigned by the given NPC.
     * @param npc - The NPC assigning the mission.
     */
    public createMission(npc: NPC): Mission {
        const rng = Math.random();
        
        // 0. The Knuthian Path: Algorithms (30% chance if factory exists)
        if (this.knuthianFactory && rng < 0.3) {
            const seed = Date.now().toString();
            const employer = this.organizationGenerator.generateFaction(seed + '_A');
            const target = this.organizationGenerator.generateFaction(seed + '_B');

            let mission: Mission;
            if (Math.random() > 0.5) {
                mission = this.knuthianFactory.createSortingMission(npc, employer, target);
            } else {
                mission = this.knuthianFactory.createSearchMission(npc, employer, target);
            }

            this.setupMissionChat(mission, npc);
            this.activeMissions.push(mission);
            
            if (this.missionPopulator) {
                this.missionPopulator.populateMissionObjectives(mission);
            }

            return mission;
        }

        // 1. Try Procedural Generation based on World State (30% chance if available)
        if (this.worldState && this.proceduralFactory && rng < 0.6) {
            const devices = this.worldState.getAllDevices();
            const candidates = devices.filter(d => d.type !== 'UPLINK'); 
            
            if (candidates.length > 0) {
                const targetDevice = candidates[Math.floor(Math.random() * candidates.length)];
                const location = this.worldState.getLocationById(targetDevice.locationId);
                
                if (location) {
                    const mission = this.proceduralFactory.createRepairMission(npc, location, targetDevice);
                    this.setupMissionChat(mission, npc);
                    this.activeMissions.push(mission);
                    return mission;
                }
            }
        }

        // 2. Fallback to Template Generation (Default)
        const targetSystem = generateHostname(npc.faction || 'corporate');
        const objectiveTarget = generateObjectiveFilename();

        const variables = {
            targetSystem,
            objectiveTarget,
            unitId: `UNIT-${Math.floor(Math.random() * 900 + 100)}`,
            incidentId: `INC-${Math.floor(Math.random() * 9000 + 1000)}`,
            faultType: this.missionRepository.getPool('faultType')[Math.floor(Math.random() * this.missionRepository.getPool('faultType').length)] || 'System Fault'
        };

        const archetypes = this.missionRepository.getArchetypeKeys();
        const type = archetypes[Math.floor(Math.random() * archetypes.length)];

        const mission = this.missionRepository.createMissionFromTemplate(type, npc, variables);
        this.setupMissionChat(mission, npc);

        this.activeMissions.push(mission);
        return mission;
    }

    private setupMissionChat(mission: Mission, npc: NPC) {
        mission.chatHistory = [
            { sender: 'SYSTEM', message: `CONNECTING TO SECURE CHANNEL ${mission.id}...`, timestamp: Date.now() },
            { sender: npc.name, message: `Operator, I require assistance with a ${mission.type} operation.`, timestamp: Date.now() },
            { sender: npc.name, message: mission.description, timestamp: Date.now() },
            { sender: 'SYSTEM', message: `REWARD ESCROW: ${mission.reward}`, timestamp: Date.now() },
        ];
    }

    /**
     * Updates mission state based on command execution results.
     * Returns hints or progression triggers.
     */
    public updateMissions(state: TerminalState, response: CommandResponse): { hints: { missionId: string, sender: string, message: string, type: string }[], progression: { result: TutorProgressionResult | null, missionId: string } | null } {
        const hints: { missionId: string, sender: string, message: string, type: string }[] = [];
        const progression = this.tutorService.checkMissionProgression(state, this.activeMissions, response);

        for (const mission of this.activeMissions) {
            const hint = this.tutorService.analyzeGameState(mission, state, response);
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
                // Check Constraints (Knuthian Physics)
                if (this.constraintValidator && response.executionStats && mission.constraints) {
                    const validation = this.constraintValidator.validate(mission, response.executionStats);
                    if (!validation.valid) {
                        const rejectionMsg = `CONSTRAINT VIOLATION: ${validation.reason}`;
                        
                        mission.chatHistory.push({
                            sender: 'SYSTEM',
                            message: rejectionMsg,
                            timestamp: Date.now()
                        });
                        
                        hints.push({ missionId: mission.id, sender: 'SYSTEM', message: rejectionMsg, type: 'WARNING' });
                        
                        // Abort progression
                        return { hints, progression: null };
                    }
                }

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
