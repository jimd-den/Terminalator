/**
 * TutorKnowledgeBase.ts - Domain Entity
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * The Blackboard: Tutor's Localized Perception Store
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * The KnowledgeBase is the "Blackboard" in our pattern. It represents the
 * limited horizon of the Tutor's awareness. It prevents the Tutor from being
 * omniscient, forcing it to plan actions only based on what has been
 * explicitly discovered or heuristically guessed.
 * 
 * DESIGN PATTERN: Blackboard Pattern
 * WHY: Decouples knowledge acquisition (Sensory Input) from knowledge 
 * application (Planning). Allows multiple strategies to contribute to a
 * shared state without direct communication.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { KnowledgeEntity, KnowledgeType } from './KnowledgeEntity';

export class TutorKnowledgeBase {
    /** 
     * Internal store of knowledge entities.
     * We use a Map keyed by type + value for O(1) deduplication and retrieval.
     */
    private readonly knowledgeMap: Map<string, KnowledgeEntity> = new Map();

    /**
     * Injects a new piece of knowledge into the blackboard.
     * If the knowledge already exists, it updates if the new info is "better"
     * (e.g., transitioning from a belief to a verified truth).
     * 
     * @param entity The knowledge entity to learn.
     */
    public learn(entity: KnowledgeEntity): void {
        const key = this.generateKey(entity.type, entity.value);
        const existing = this.knowledgeMap.get(key);

        if (!existing || this.isKnowledgeBetter(existing, entity)) {
            this.knowledgeMap.set(key, entity);
        }
    }

    /**
     * Retrieves all knowledge of a specific type.
     * 
     * @param type The category of knowledge to recall.
     * @returns Array of matching knowledge entities.
     */
    public recall(type: KnowledgeType): KnowledgeEntity[] {
        return Array.from(this.knowledgeMap.values())
            .filter(e => e.type === type);
    }

    /**
     * Returns everything the Tutor knows.
     */
    public getAll(): KnowledgeEntity[] {
        return Array.from(this.knowledgeMap.values());
    }

    /**
     * Checks if the Tutor knows about a specific value.
     */
    public has(type: KnowledgeType, value: string): boolean {
        return this.knowledgeMap.has(this.generateKey(type, value));
    }

    /**
     * Generates a unique key for O(1) lookup.
     */
    private generateKey(type: KnowledgeType, value: string): string {
        return `${type}:${value}`;
    }

    /**
     * Determines if new knowledge should replace existing knowledge.
     * Truth (isBelief=false) always overrides Belief (isBelief=true).
     */
    private isKnowledgeBetter(existing: KnowledgeEntity, incoming: KnowledgeEntity): boolean {
        // Truth overrides belief
        if (existing.isBelief && !incoming.isBelief) return true;
        
        // If both are truth/belief, the newer one might have better metadata or timestamp
        if (existing.isBelief === incoming.isBelief) {
            return incoming.discoveredAt > existing.discoveredAt;
        }

        return false;
    }
}
