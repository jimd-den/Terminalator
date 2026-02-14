/**
 * ICommandStrategy.ts - Domain Service
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * Command Generation Strategy
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Extends the Planner Action to include the ability to generate a physical 
 * Unix command string based on the Tutor's current knowledge.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { IPlannerAction } from './IPlannerAction';
import { TutorKnowledgeBase } from '../../../entities/knowledge/TutorKnowledgeBase';

export interface ICommandStrategy extends IPlannerAction {
    /**
     * Generates the actual shell command string to be executed or suggested.
     * 
     * @param kb The Tutor's current knowledge base to pull parameters from.
     * @returns A valid Unix command string (e.g., "ls -la /etc", "ping 10.0.0.1").
     */
    generateCommand(kb: TutorKnowledgeBase): string;
}
