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
import { generateHostname, generateObjectiveFilename } from '../utils/NameGenerator';

export type MissionType = 'hack' | 'exfiltrate' | 'modify' | 'decrypt';

export interface ChatMessage {
    sender: string;
    message: string;
    timestamp: number;
}

export interface Mission {
    id: string;
    type: MissionType;
    targetSystem: string;
    targetUser: string;
    objectiveTarget: string;
    description: string;
    reward: string;
    status: 'active' | 'completed' | 'failed';
    assignedBy: string; // NPC ID
    assignerName: string; // NPC Name
    chatHistory: ChatMessage[];
}

export class MissionGenerator {
    private static rewards = [
        '500 Credits',
        '1000 Credits',
        'Rootkit V2',
        'Proxy Node Access',
    ];

    /**
     * Generates a unique mission for a given NPC.
     * Note: Does NOT register the system in NetworkMap yet; that is the caller's responsibility (GameManager).
     */
    static generate(npc: NPC): Mission {
        const id = Math.random().toString(36).substring(2, 6).toUpperCase();
        const type = this.getRandomType();
        const targetSystem = generateHostname(npc.faction || 'corporate'); // Assume NPC has faction or default
        const targetUser = 'admin'; // Usually target admin/root files
        const objectiveTarget = generateObjectiveFilename();
        const reward = this.getRandomReward();

        return {
            id,
            type,
            targetSystem,
            targetUser,
            objectiveTarget,
            description: this.generateDescription(type, targetSystem, objectiveTarget),
            reward,
            status: 'active',
            assignedBy: npc.id,
            assignerName: npc.name,
            chatHistory: [],
        };
    }

    private static getRandomType(): MissionType {
        const types: MissionType[] = ['exfiltrate', 'modify']; // Focus on these for now
        return types[Math.floor(Math.random() * types.length)];
    }

    private static getRandomReward(): string {
        return this.rewards[Math.floor(Math.random() * this.rewards.length)];
    }

    private static generateDescription(type: MissionType, system: string, file: string): string {
        switch (type) {
            case 'exfiltrate':
                return `Connect to ${system}. Retrieve payload ${file} and upload it to your home server.`;
            case 'modify':
                return `Connect to ${system}. Locate ${file} and append the signature 'HACKED'.`;
            default:
                return `Access ${system} and investigate.`;
        }
    }
}
