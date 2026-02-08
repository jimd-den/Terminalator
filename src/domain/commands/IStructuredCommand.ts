/**
 * IStructuredCommand.ts - Domain Protocol
 * 
 * Defines the contract for "Smart" commands that the Mission Generator
 * can build programmatically.
 * 
 * Pillar: THE FOUR-FOLD SHIELD (Interface Segregation)
 */

import { ICommand } from './ICommand';
import { CommandCapability } from '../entities/knowledge/UnixCommandDefinition';

export { CommandCapability };

export interface IStructuredCommand extends ICommand {
    readonly capabilities: CommandCapability[];
    readonly utility: string;
    
    /**
     * Build arguments programmatically based on mission requirements.
     * e.g. { pattern: '500', file: 'access.log' } -> ['-e', '500', 'access.log']
     */
    buildArgs(requirements: Record<string, any>): string[];
}
