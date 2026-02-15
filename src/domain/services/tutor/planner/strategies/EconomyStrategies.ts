/**
 * EconomyStrategies.ts - Domain Service
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * Economy-Based Action Strategies
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { ICommandStrategy } from '../ICommandStrategy';
import { PlannerState } from '../IPlannerAction';
import { KnowledgeType } from '../../../../entities/knowledge/KnowledgeEntity';
import { TutorKnowledgeBase } from '../../../../entities/knowledge/TutorKnowledgeBase';
import { ToolRegistry } from '../../../../services/economy/ToolRegistry';

/**
 * Strategy to buy a specific tool from a vendor node.
 */
export class BuyToolStrategy implements ICommandStrategy {
    public readonly name: string;
    public readonly cost: number;
    private readonly toolBinary: string;

    constructor(toolBinary: string) {
        const tool = ToolRegistry.getToolByBinary(toolBinary);
        this.name = `Buy_${toolBinary}`;
        this.toolBinary = toolBinary;
        this.cost = 5; // Lower cost to encourage automation (Phase 10 fix)
    }

    public isSatisfiedBy(state: PlannerState): boolean {
        // Only buy if we don't have it yet
        const alreadyOwned = state.knownTools.has(this.toolBinary);
        const satisfied = !alreadyOwned;
        console.log(`[BuyToolStrategy] isSatisfied: ${satisfied}. tool: ${this.toolBinary}, alreadyOwned: ${alreadyOwned}`);
        return satisfied;
    }

    public applyEffects(state: PlannerState): PlannerState {
        const nextTools = new Set(state.knownTools);
        nextTools.add(this.toolBinary);
        console.log(`[BuyToolStrategy] applyEffects: added ${this.toolBinary} to knownTools. New size: ${nextTools.size}`);
        return {
            ...state,
            knownTools: nextTools,
            currentHost: state.currentHost
        };
    }

    public generateCommand(kb: TutorKnowledgeBase, goalHost?: string): string {
        const tool = ToolRegistry.getToolByBinary(this.toolBinary);
        return `transfer --amount ${tool?.cost || 500} --tool ${this.toolBinary}`;
    }
}
