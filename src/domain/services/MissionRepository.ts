import MissionCatalog from '../data/MissionCatalog.json';
import { Mission, MissionStep } from '../entities/Mission';
import { NPC } from '../entities/NPC';

/**
 * MissionRepository - Domain Service
 * 
 * Responsible for loading mission templates from static data
 * and performing variable injection.
 * 
 * Pillar: The Master's Tool (Technical Excellence)
 * Pillar: The Balanced Scale (KISS)
 */

export interface MissionTemplate {
    id: string;
    display_name: string;
    narrative_fallback: string;
    steps: {
        type: string;
        instructions: string;
        command: string;
        nextStep: string;
    }[];
    templates: {
        description: string;
        reward: string;
    }[];
}

export class MissionRepository {
    private catalog = MissionCatalog;

    public getRandomTemplate(archetype: string): MissionTemplate | null {
        return (this.catalog.archetypes as any)[archetype] || null;
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
