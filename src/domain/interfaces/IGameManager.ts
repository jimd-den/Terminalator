/**
 * IGameManager.ts
 *
 * Domain Interface for Game Management.
 * Allows Domain Services to trigger game events without depending on the Interface Adapter layer.
 */
import { MailMessage } from '../usecases/MailSystem';
import { Mission } from '../entities/Mission';
import { TerminalState } from '../entities/TerminalState';
import { CommandResponse } from '../entities/Command';
import { TutorEngine } from '../entities/TutorEngine';

export interface IGameManager {
    tutorEngine: TutorEngine;
    spawnNPCEvent(): Mission | null;
    getActiveMissions(): Mission[];
    startMission(id: string): void;
    abandonMission(id: string): void;
    onCommandExecuted(state: TerminalState, response: CommandResponse, prevFsContext?: string): void;
}
