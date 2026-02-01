/**
 * Mission Data Transfer Object (DTO)
 * 
 * " The Mission Briefing "
 * 
 * Represents the mission data exactly as the User Interface needs to display it.
 * This object is a pure data carrier—it has no logic, methods, or hidden behaviors.
 * 
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Storyteller's Code (Literate Documentation)
 * 
 * Intent:
 * To provide the CommsPane (UI) with a safe, read-only snapshot of a mission
 * without exposing the internal Domain Entity or its complexities.
 */

export interface ChatMessageDTO {
    sender: string;
    message: string;
    timestamp: number;
}

export interface MissionDTO {
    /** Unique identifier for tracking selection */
    id: string;

    /** The type of operation (e.g., 'hack', 'exfiltrate') */
    type: string;

    /** Name of the NPC who assigned this mission */
    assignerName: string;

    /** Current status of the mission (pending, active, etc.) used for UI states */
    status: string;

    /** Progress step for granular UI feedback (e.g., "CONNECTED") */
    currentStep: string;

    /** The conversation history to display in the message stream */
    chatHistory: ChatMessageDTO[];
}
