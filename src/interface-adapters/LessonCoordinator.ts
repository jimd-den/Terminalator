/**
 * LessonCoordinator - Interface Adapter Layer
 * 
 * Bridges events from the TutorEngine to other systems.
 * Handles side effects like sending lore mail or updating mission status upon lesson completion.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Storyteller’s Code (Literate Documentation)
 * Pillar: The Balanced Scale (KISS) - Separates UI/Event logic from core state management.
 */

import { TutorEngine, TutorEvent, Lesson } from '../domain/entities/TutorEngine';
import { MailSystem } from '../domain/usecases/MailSystem';
import { NPC, NPCGenerator } from '../domain/entities/NPC';
import { MissionService } from '../domain/services/MissionService';
import { EconomyService } from '../domain/services/EconomyService';

export class LessonCoordinator {
    constructor(
        private tutorEngine: TutorEngine,
        private mailSystem: MailSystem,
        private missionService: MissionService,
        private economyService: EconomyService
    ) {
        // Wire up Tutor Events
        this.tutorEngine.subscribe(this.handleTutorEvent);
    }

    /**
     * Handles events emitted by the TutorEngine.
     * Maps low-level typing events to high-level game consequences.
     */
    private handleTutorEvent = (event: TutorEvent) => {
        // Default TutorBot NPC for system messages
        const tutorNpc: NPC = {
            id: 'tutor_bot',
            name: 'TutorBot',
            career: 'Training AI',
            origin: 'Mainframe',
            goal: 'Educate',
            status: 'active',
            traits: ['Precise', 'Strict'],
            loadout: []
        };

        switch (event.type) {
            case 'START':
                this.economyService.startSession();
                break;

            case 'SPEED_WARNING':
                // We keep this minimal to avoid spamming the user
                if (event.payload === 'TOO FAST') {
                    // console.log('SYNC RATE EXCEEDED. SLOW DOWN.');
                }
                break;

            case 'COMPLETE':
                const { lesson, stats } = event.payload;

                if (!lesson) return;

                // 1. Send Lore Mail (Persistence / Narrative)
                this.mailSystem.sendMail(
                    tutorNpc,
                    'LESSON COMPLETE',
                    `MODULE ${lesson.id} VERIFIED. PROCEEDING.`
                );

                // 2. Mission Integration (if lesson is tied to a mission)
                if (lesson && lesson.id && lesson.id.startsWith('MISSION_')) {
                    const missionId = lesson.id.replace('MISSION_', '');
                    const mission = this.missionService.getMissionById(missionId);
                    if (mission) {
                        // Progression messages were historically added here, 
                        // but now we rely on MissionService.updateMissions doing the heavy lifting.
                        // However, a completion message in chatHistory is still useful for UI feedback.
                        mission.chatHistory.push({
                            sender: 'SYSTEM',
                            message: `PROTOCOL ${lesson.id} SECURED.`,
                            timestamp: Date.now()
                        });
                    }
                }
                break;

            case 'MISTAKE':
                // Can trigger specific NPC reactions or lore warnings here if needed
                break;
        }
    };
}
