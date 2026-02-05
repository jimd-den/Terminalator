import { IGameManager } from '../../interfaces/IGameManager';

export interface INavigator {
    navigate(view: string, params?: any): void;
}

/**
 * MissionManager - Domain Use Case
 * 
 * Orchestrates the high-level transitions between the Dashboard and active Missions.
 * 
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Balanced Scale (SOLID)
 */
export class MissionManager {
    constructor(
        private gameManager: IGameManager,
        private navigator: INavigator
    ) {}

    /**
     * Initiates a mission and transitions the UI to the Mission view.
     */
    public startMission(missionId: string): void {
        this.gameManager.startMission(missionId);
        this.navigator.navigate('Terminal', { missionId });
    }

    /**
     * Safely aborts or finishes a mission and returns to the Dashboard.
     */
    public exitMission(): void {
        this.navigator.navigate('Terminal', { missionId: null });
    }
}
