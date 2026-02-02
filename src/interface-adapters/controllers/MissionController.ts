/**
 * MissionController - Interface Adapter Layer
 * 
 * " The Operations Manager "
 * 
 * Handles user interactions with the Mission System (Comms Pane).
 * Manages accepting, abandoning, and switching active missions.
 * 
 * Pillar: The Four-Fold Shield (Separation of Concerns)
 * Pillar: The Storyteller's Code (Literate Documentation)
 */

import { IGameManager } from '../../domain/interfaces/IGameManager';
import { MissionDTO } from '../../domain/dtos/MissionDTO';

export interface MissionControllerActions {
    startMission: (id: string) => void;
    abandonMission: (id: string) => void;
    getActiveMissions: () => any[]; // Returns Entities, VM maps to DTO
}

export class MissionController {

    constructor(
        private gameManager: IGameManager,
        private setMissions: (missions: any[]) => void, // Hook setter
        private onStartCallback?: (id: string) => void // Optional UI callback
    ) { }

    /**
     * Accepts and activates a pending mission.
     * 
     * @param id - The UUID of the mission to start.
     */
    public startMission(id: string, currentState?: any): void {
        this.gameManager.startMission(id, currentState);
        this.refreshMissions();
        if (this.onStartCallback) this.onStartCallback(id);
    }

    /**
     * Abandons or Declines a mission.
     * 
     * @param id - The UUID of the mission to drop.
     */
    public abandonMission(id: string): void {
        this.gameManager.abandonMission(id);
        this.refreshMissions();
    }

    /**
     * Private helper to refresh the ViewModel's mission list.
     */
    private refreshMissions(): void {
        this.setMissions([...this.gameManager.getActiveMissions()]);
    }
}
