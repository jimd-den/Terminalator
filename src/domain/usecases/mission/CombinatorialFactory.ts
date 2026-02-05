/**
 * CombinatorialFactory.ts - Domain Use Case
 * 
 * Logic for assembling valid Mission entities by cross-multiplying
 * Grammar variables and Utility capabilities.
 * 
 * Pillar: THE MASTER'S TOOL (Combinatorial Grammar)
 * Pillar: THE Swift Stream (Performance & Purity)
 */

import { Mission, MissionStep } from '../../entities/Mission';
import { MissionMotive, MissionVerb, MissionNoun } from '../../entities/mission/Grammar';
import { IStructuredCommand, CommandCapability } from '../../commands/IStructuredCommand';

export class CombinatorialFactory {
    /**
     * @param commands - List of available "Smart" commands.
     */
    constructor(private commands: IStructuredCommand[]) {}

    /**
     * Assembles a mission from grammar components.
     */
    public createMission(params: {
        motive: MissionMotive,
        verb: MissionVerb,
        noun: MissionNoun,
        targetSystem: string
    }): Mission {
        
        // 1. Map Verb to Command Capability
        const requiredCapability = this.mapVerbToCapability(params.verb);
        
        // 2. Select matching Command
        const command = this.commands.find(c => c.capabilities.includes(requiredCapability));

        if (!command) {
            throw new Error(`Scale Failure: No utility registered with capability ${requiredCapability} for verb ${params.verb}`);
        }

        // 3. Construct Semantic ID
        const id = `M-${params.motive.substring(0,3)}-${Math.random().toString(36).substr(2,5).toUpperCase()}`;
        
        // 4. Map Noun to plausible path (Mock data binding for now)
        const targetPath = this.mapNounToPath(params.noun);

        // 5. Build Final Entity
        return {
            id,
            type: 'log-analysis', // Base archetype
            targetSystem: params.targetSystem,
            targetUser: 'admin',
            objectiveTarget: targetPath,
            description: `PROTOCOL: ${params.motive}. ${params.verb} the ${params.noun} located on ${params.targetSystem}.`,
            reward: '1500 Credits',
            status: 'pending',
            currentStep: MissionStep.PENDING,
            assignedBy: 'system',
            assignerName: 'THE GRID',
            chatHistory: [],
            metadata: {
                logic: {
                    motive: params.motive,
                    verb: params.verb,
                    noun: params.noun
                },
                utility: command.utility,
                programmaticArgs: command.buildArgs({ noun: params.noun, path: targetPath })
            }
        };
    }

    private mapVerbToCapability(verb: MissionVerb): CommandCapability {
        const map: Record<MissionVerb, CommandCapability> = {
            [MissionVerb.EXTRACT]: CommandCapability.READ,
            [MissionVerb.APPEND]: CommandCapability.MODIFY,
            [MissionVerb.DELETE]: CommandCapability.MODIFY,
            [MissionVerb.VERIFY]: CommandCapability.READ,
            [MissionVerb.COUNT]: CommandCapability.FILTER,
            [MissionVerb.SORT]: CommandCapability.TRANSFORM
        };
        return map[verb];
    }

    private mapNounToPath(noun: MissionNoun): string {
        const map: Record<MissionNoun, string> = {
            [MissionNoun.SERVER_LOGS]: '/var/log/httpd/access.log',
            [MissionNoun.DB_RECORDS]: '/var/lib/mysql/dump.sql',
            [MissionNoun.CONFIG_FILES]: '/etc/sysconfig/network',
            [MissionNoun.SATLINK_STREAM]: '/dev/sat0',
            [MissionNoun.PERSONNEL_FILES]: '/home/hr/employees.csv'
        };
        return map[noun];
    }
}
