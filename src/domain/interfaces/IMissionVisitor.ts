/**
 * IMissionVisitor.ts - Domain Interface
 * 
 * Defines the contract for visiting Mission entities.
 * Enables decoupled processing of mission metadata by the Tutor.
 * 
 * Pillar: THE MASTER'S TOOL (Visitor Pattern)
 */

import { Mission } from '../entities/Mission';

export interface IMissionVisitor<T> {
    /**
     * Extracts information from a mission.
     */
    visit(mission: Mission): T;
}
