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
        this.cost = tool ? tool.cost / 10 : 50; // Map Ƶ to Planner Cost
    }

    public isSatisfiedBy(state: PlannerState): boolean {
        // Precondition: Must know about a vendor node (METADATA usually stores vendor info in this sim)
        // Or we can just assume if we have a goal for a tool, we can buy it if we have enough Ƶ.
        // For simplicity, we assume the Tutor knows where to buy.
        return true;
    }

    public applyEffects(state: PlannerState): PlannerState {
        const nextTools = new Set(state.knownTools);
        nextTools.add(this.toolBinary);
        return {
            ...state,
            knownTools: nextTools
        };
    }

    public generateCommand(kb: TutorKnowledgeBase): string {
        const tool = ToolRegistry.getToolByBinary(this.toolBinary);
        return `transfer --amount ${tool?.cost || 500} --tool ${this.toolBinary}`;
    }
}
