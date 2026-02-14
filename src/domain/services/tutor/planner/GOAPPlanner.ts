/**
 * GOAPPlanner.ts - Domain Service
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * Goal-Oriented Action Planning (GOAP) Engine
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * An implementation of the A* algorithm tailored for resolving chains of
 * interdependent actions based on a knowledge-state blackboard.
 * 
 * DESIGN PATTERN: Strategy Pattern (for Actions), Command Pattern (for results).
 * WHY: Decouples the "How" (planning) from the "What" (specific Unix strategies).
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { IPlannerAction, PlannerState } from './IPlannerAction';
import { KnowledgeType } from '../../../entities/knowledge/KnowledgeEntity';

/**
 * Internal search node for the A* algorithm.
 */
class PlannerNode {
    constructor(
        public readonly state: PlannerState,
        public readonly g: number, // Cost from start to this node
        public readonly h: number, // Heuristic cost to goal
        public readonly action: IPlannerAction | null,
        public readonly parent: PlannerNode | null
    ) {}

    public get f(): number {
        return this.g + this.h;
    }
}

export class GOAPPlanner {
    /**
     * Resolves a sequence of actions to reach a goal state from a starting state.
     * 
     * @param start The initial knowledge state.
     * @param goal The desired knowledge state (the goal).
     * @param actions The library of available actions.
     * @returns A chain of actions, or null if no path exists.
     */
    public plan(
        start: PlannerState,
        goal: PlannerState,
        actions: IPlannerAction[]
    ): IPlannerAction[] | null {
        const openSet: PlannerNode[] = [];
        const closedSet: Set<string> = new Set();

        // Initialize search
        openSet.push(new PlannerNode(start, 0, this.calculateHeuristic(start, goal), null, null));

        while (openSet.length > 0) {
            // Sort by f-score (lowest first)
            openSet.sort((a, b) => a.f - b.f);
            const current = openSet.shift()!;

            // Check if goal reached
            if (this.isGoalReached(current.state, goal)) {
                return this.reconstructPath(current);
            }

            const stateKey = this.serializeState(current.state);
            closedSet.add(stateKey);

            // Expand node
            for (const action of actions) {
                if (action.isSatisfiedBy(current.state)) {
                    const nextState = action.applyEffects(current.state);
                    const nextStateKey = this.serializeState(nextState);

                    if (closedSet.has(nextStateKey)) continue;

                    const g = current.g + action.cost;
                    const h = this.calculateHeuristic(nextState, goal);
                    
                    // Check if already in openSet with better score
                    const existing = openSet.find(n => this.serializeState(n.state) === nextStateKey);
                    if (existing && existing.g <= g) continue;

                    if (existing) {
                        // Update existing node? (In A* we usually just add it and let the sort handle it, 
                        // but updating is cleaner)
                        const index = openSet.indexOf(existing);
                        openSet.splice(index, 1);
                    }

                    openSet.push(new PlannerNode(nextState, g, h, action, current));
                }
            }
        }

        return null; // No path found
    }

    /**
     * Goal is reached if the current state possesses all the types required by the goal state.
     */
    private isGoalReached(current: PlannerState, goal: PlannerState): boolean {
        for (const type of goal.knownTypes) {
            if (!current.knownTypes.has(type)) return false;
        }
        // Values can also be required
        for (const value of goal.knownValues) {
            if (!current.knownValues.has(value)) return false;
        }
        // Tools can also be required
        if (goal.knownTools) {
            for (const tool of goal.knownTools) {
                if (!current.knownTools || !current.knownTools.has(tool)) return false;
            }
        }
        return true;
    }

    /**
     * Simple heuristic: count of missing knowledge types.
     */
    private calculateHeuristic(current: PlannerState, goal: PlannerState): number {
        let count = 0;
        for (const type of goal.knownTypes) {
            if (!current.knownTypes.has(type)) count++;
        }
        return count;
    }

    /**
     * Serializes a state for hashing/comparison.
     */
    private serializeState(state: PlannerState): string {
        const types = Array.from(state.knownTypes).sort().join(',');
        const values = Array.from(state.knownValues).sort().join(',');
        const tools = Array.from(state.knownTools || []).sort().join(',');
        return `T:[${types}]|V:[${values}]|K:[${tools}]`;
    }

    /**
     * Backtracks from the leaf node to the root to produce the action chain.
     */
    private reconstructPath(node: PlannerNode): IPlannerAction[] {
        const path: IPlannerAction[] = [];
        let current: PlannerNode | null = node;
        while (current && current.action) {
            path.unshift(current.action);
            current = current.parent;
        }
        return path;
    }
}
