/**
 * GameEventObserver.ts
 *
 * Pillar: The Four-Fold Shield (Domain Service)
 * Pillar: The Balanced Scale (Observer Pattern)
 *
 * Intent:
 * Monitors the state of the terminal simulation and triggers procedural game events (NPC messages).
 * Decouples "Game Rules" from "UI Rendering".
 */

import { IGameManager } from '../interfaces/IGameManager';

export class GameEventObserver {
    constructor(private gameManager: IGameManager) { }

    /**
     * Checks if a procedural event should be triggered based on current state.
     * @param outputLineCount - The number of lines currently in the terminal output.
     * @returns A formatted message string if an event occurs, or null.
     */
    public checkProceduralEvents(outputLineCount: number): string | null {
        // Logic: Every 4th line after the initial boot (5 lines), spawn an NPC event.
        if (outputLineCount > 5 && outputLineCount % 4 === 0) {
            const mail = this.gameManager.spawnNPCEvent();
            return `[ NEW TRANSMISSION: ID ${mail.id} FROM ${mail.from} ]`;
        }
        return null;
    }
}
