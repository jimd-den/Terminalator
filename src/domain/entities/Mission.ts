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

export type MissionType = 'hack' | 'decrypt' | 'retrieve' | 'monitor';

export interface ChatMessage {
    sender: string;
    message: string;
    timestamp: number;
}

export interface Mission {
    id: string;
    type: MissionType;
    target: string;
    description: string;
    reward: string;
    status: 'active' | 'completed' | 'failed';
    assignedBy: string; // NPC ID
    assignerName: string; // NPC Name
    chatHistory: ChatMessage[];
}

export class MissionGenerator {
    private static targets = [
        'Corporate Mainframe',
        'Orbital Relay Node',
        'Black Market Server',
        'Sector 7 Grid',
        'Derelict Ship Log',
    ];

    private static rewards = [
        'Crypto Credits',
        'Systems Upgrade',
        'Decrypt Key',
        'Safe Passage Code',
    ];

    /**
     * Generates a unique mission for a given NPC.
     *
     * @param npc - The NPC assigning the mission.
     * @returns A populated Mission object.
     */
    static generate(npc: NPC): Mission {
        const id = Math.random().toString(36).substring(2, 6).toUpperCase();
        const type = this.getRandomType();
        const target = this.getRandomTarget();
        const reward = this.getRandomReward();

        return {
            id,
            type,
            target,
            description: this.generateDescription(type, target, npc),
            reward,
            status: 'active',
            assignedBy: npc.id,
            assignerName: npc.name,
            chatHistory: [],
        };
    }

    private static getRandomType(): MissionType {
        const types: MissionType[] = ['hack', 'decrypt', 'retrieve', 'monitor'];
        return types[Math.floor(Math.random() * types.length)];
    }

    private static getRandomTarget(): string {
        return this.targets[Math.floor(Math.random() * this.targets.length)];
    }

    private static getRandomReward(): string {
        return this.rewards[Math.floor(Math.random() * this.rewards.length)];
    }

    private static generateDescription(type: MissionType, target: string, npc: NPC): string {
        switch (type) {
            case 'hack':
                return `Install backdoor in ${target}.`;
            case 'decrypt':
                return `Decrypt archive at ${target}.`;
            case 'retrieve':
                return `Fetch payload from ${target}.`;
            case 'monitor':
                return `Tap comms at ${target}.`;
            default:
                return `Investigate ${target}.`;
        }
    }
}
