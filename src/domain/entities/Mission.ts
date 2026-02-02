/**
 * Mission Entity - Domain Layer
 * 
 * Represents a procedural mission generated for the player.
 * Missions are assigned by NPCs and provided via Mail.
 *
 * Pillar: The Storyteller’s Code (Literate Documentation)
 * Pillar: The Swift Stream (Performance & Purity)
 *
 * Intent:
 * Generates dynamic content to keep the gameplay loop engaging.
 * Connects NPCs to actionable tasks for the player.
 */

import { NPC } from './NPC';

export type MissionType = 'hack' | 'exfiltrate' | 'modify' | 'decrypt' | 'log-analysis' | 'dispatcher';

export interface ChatMessage {
    sender: string;
    message: string;
    timestamp: number;
}


export enum MissionStep {
    PENDING = 'PENDING',
    CONNECTED = 'CONNECTED',
    LOCATED = 'LOCATED',
    COMPLETED = 'COMPLETED'
}

export interface Mission {
    id: string;
    type: MissionType;
    targetSystem: string;
    targetUser: string;
    objectiveTarget: string;
    description: string;
    reward: string;
    status: 'pending' | 'active' | 'completed' | 'failed';
    currentStep: MissionStep; // [NEW] Track granular progress
    assignedBy: string; // NPC ID
    assignerName: string; // NPC Name
    chatHistory: ChatMessage[];
}

