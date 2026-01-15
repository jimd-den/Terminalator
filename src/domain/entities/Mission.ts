/**
 * Mission Entity - Domain Layer
 * 
 * Represents a procedural mission generated for the player.
 * Missions are assigned by NPCs and provided via Mail.
 */

import { NPC } from './NPC';

export type MissionType = 'hack' | 'decrypt' | 'retrieve' | 'monitor';

export interface Mission {
    id: string;
    type: MissionType;
    target: string;
    description: string;
    reward: string;
    status: 'active' | 'completed' | 'failed';
    assignedBy: string; // NPC ID
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
                return `Gain root access to ${target}. ${npc.name} needs a backdoor installed.`;
            case 'decrypt':
                return `Decrypt the secure archive at ${target}. It contains evidence for ${npc.goal}.`;
            case 'retrieve':
                return `Navigate to ${target} and retrieve the payload. Priority Alpha.`;
            case 'monitor':
                return `Tap into the comms feed at ${target}. ${npc.name} suspects compromised chatter.`;
            default:
                return `Investigate ${target}.`;
        }
    }
}
