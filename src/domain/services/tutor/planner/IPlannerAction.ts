/**
 * IPlannerAction.ts - Interface Adapter / Domain Service
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * GOAP Action Interface
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Defines the contract for an action that the GOAP Planner can reason about.
 * Each action has preconditions (what knowledge is required) and effects 
 * (what knowledge is gained).
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { KnowledgeType } from '../../../entities/knowledge/KnowledgeEntity';

/**
 * Represents the state of the Tutor's knowledge at any given point 
 * in the planning process.
 */
export interface PlannerState {
    /** The set of knowledge types the Tutor currently possesses. */
    readonly knownTypes: Set<KnowledgeType>;
    
    /** 
     * Specific known values (e.g., specific file paths or IPs).
     * Used for more granular planning when types alone are insufficient.
     */
    readonly knownValues: Set<string>;

    /**
     * Tools the user has in their inventory (/bin).
     */
    readonly knownTools: Set<string>;

    /**
     * The hostname of the system the user is currently logged into.
     */
    readonly currentHost: string;
}

export interface IPlannerAction {
    /** Human-readable name of the action (e.g., "ScanNetwork", "ReadFile"). */
    readonly name: string;

    /** 
     * The relative cost of performing this action.
     * Lower costs are prioritized by the A* pathfinder.
     */
    readonly cost: number;

    /**
     * Checks if the preconditions for this action are met in the given state.
     * @param state The current planning state.
     */
    isSatisfiedBy(state: PlannerState): boolean;

    /**
     * Applies the effects of this action to the given state, returning a new state.
     * This is a pure function to support A* branch exploration.
     * @param state The state before the action.
     * @returns The state after the action.
     */
    applyEffects(state: PlannerState): PlannerState;
}
