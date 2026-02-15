/**
 * IGameManager.ts
 *
 * Domain Interface for Game Management.
 * Allows Domain Services to trigger game events without depending on the Interface Adapter layer.
 */
import { Mission } from '../entities/Mission';
import { TerminalState } from '../entities/TerminalState';
import { CommandResponse } from '../entities/Command';
import { TutorEngine, Lesson } from '../entities/TutorEngine';
import { NPC } from '../entities/NPC';

import { SimulationBus } from '../services/SimulationBus';
import { TutorObserver } from '../services/tutor/TutorObserver';

export interface IGameManager {
    tutorEngine: TutorEngine;
    getSimulationBus(): SimulationBus;
    getTutorObserver(): TutorObserver;
    spawnNPCEvent(): Promise<Mission | null> | Mission | null;
    getActiveMissions(): Mission[];
    getActiveNPCs(): NPC[];
    startMission(id: string, currentState?: TerminalState): Promise<void>;
    abandonMission(id: string): void;
    onCommandExecuted(state: TerminalState, response: CommandResponse, prevFsContext?: string): void;
    startTutor(lessonId: string): void;
    startRandomLesson(): Lesson;
    ensureSystemPrepared(hostname: string): void;
}