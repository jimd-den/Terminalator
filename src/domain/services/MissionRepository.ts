import { Mission, MissionStep } from '../entities/Mission';
import { NPC } from '../entities/NPC';
import { IMissionDataProvider, MissionTemplate } from '../interfaces/IMissionDataProvider';

/**
 * MissionRepository - Domain Service
 * 
 * Responsible for loading mission templates from abstract data provider
 * and performing variable injection.
 * 
 * Pillar: The Master's Tool (Technical Excellence)
 * Pillar: The Balanced Scale (KISS)
 */

export class MissionRepository {
    constructor(private dataProvider: IMissionDataProvider) {}

    public getRandomTemplate(archetype: string): MissionTemplate | null {
        return this.dataProvider.getTemplate(archetype);
    }

    public getArchetypeKeys(): string[] {
        return this.dataProvider.getAllArchetypeIds();
    }

    public getPool(key: string): string[] {
        return this.dataProvider.getVariablePool(key);
    }

    /**
     * Injects variables into a template string.
     */
    public injectVariables(template: string, variables: Record<string, string>): string {
        return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
            return variables[key] || `{{${key}}}`;
        });
    }

    /**
     * Creates a Mission entity from a template and NPC.
     */
    public createMissionFromTemplate(archetype: string, npc: NPC, variables: Record<string, string>): Mission {
        const template = this.getRandomTemplate(archetype);
        if (!template) {
            throw new Error(`Mission archetype ${archetype} not found in catalog.`);
        }

        const selectedVariant = template.templates[Math.floor(Math.random() * template.templates.length)];

        const mission: Mission = {
            id: `M-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
            type: archetype as any,
            targetSystem: variables.targetSystem || 'unknown-host',
            targetUser: variables.targetUser || 'admin',
            objectiveTarget: variables.objectiveTarget || 'payload.dat',
            description: this.injectVariables(selectedVariant.description, variables),
            reward: selectedVariant.reward,
            rewardValue: parseInt(selectedVariant.reward) || 1000,
            status: 'pending',
            currentStep: MissionStep.PENDING,
            assignedBy: npc.id,
            assignerName: npc.name,
            chatHistory: []
        };

        return mission;
    }

    /**
     * Gets the steps for a specific archetype.
     */
    public getStepsForArchetype(archetype: string) {
        const template = this.getRandomTemplate(archetype);
        return template?.steps || [];
    }
}
