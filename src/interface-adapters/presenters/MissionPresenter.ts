/**
 * MissionPresenter - Interface Adapter Layer
 * 
 * " The Handler's Interface "
 * 
 * Formats mission status updates and notifications for the UI.
 * Transforms mission state changes into user-facing text logs.
 * 
 * Pillar: The Swift Stream (Pure Functions)
 * Pillar: The Storyteller's Code (Literate Documentation)
 */

import { MissionDTO } from '../../domain/dtos/MissionDTO';

export class MissionPresenter {

    /**
     * Formats a notification when a new mission is received.
     * 
     * @param mission - The newly assigned mission DTO.
     * @returns A friendly system string.
     */
    static presentNewMissionAlert(mission: MissionDTO): string {
        return `INCOMING TRANSMISSION: NEW CONTRACT AVAILABLE FROM [${mission.assignerName.toUpperCase()}]`;
    }

    /**
     * Formats the mission objective for display in the status bar or help.
     * 
     * @param mission - The mission to summarize.
     * @returns A concise objective string.
     */
    static presentObjective(mission: MissionDTO): string {
        return `OBJECTIVE: ${mission.type.toUpperCase()} - TARGET: ${mission.assignerName}`; // Simpler for now
    }

    /**
     * Formats a status update message based on the mission's current step.
     * 
     * @param mission - The mission being updated.
     * @returns A status update string.
     */
    static presentStatusUpdate(mission: MissionDTO): string {
        switch (mission.currentStep) {
            case 'PENDING':
                return `STATUS: AWAITING ACCEPTANCE`;
            case 'CONNECTED':
                return `STATUS: UPLINK ESTABLISHED. PROCEED TO OBJECTIVE.`;
            case 'LOCATED':
                return `STATUS: TARGET IDENTIFIED. EXFILTRATE/MODIFY AS REQUESTED.`;
            case 'COMPLETED':
                return `STATUS: MISSION ACCOMPLISHED. PAYMENT PENDING...`;
            default:
                return `STATUS: UNKNOWN`;
        }
    }
}
