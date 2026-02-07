/**
 * UnixKnowledgeBase.ts
 *
 * Pillar: THE SOURCE OF TRUTH (Knowledge Registry)
 * Pillar: THE FOUR-FOLD SHIELD (Clean Architecture) - Domain Service
 *
 * Intent:
 * A queryable registry of Unix commands and their semantic properties.
 * Used by the Mission Generator to solve constraints and by the Tutor 
 * to explain technical concepts.
 */

import { UnixCommandDefinition, CommandCapability, IOType } from '../../entities/knowledge/UnixCommandDefinition';

export class UnixKnowledgeBase {
    private commands: Map<string, UnixCommandDefinition> = new Map();

    constructor() {
        this.initializeCoreCommands();
    }

    private initializeCoreCommands() {
        // GREP
        this.register({
            name: 'grep',
            description: 'Global Regular Expression Print. Searches text for patterns.',
            capabilities: [CommandCapability.FILTER, CommandCapability.SEARCH],
            inputType: IOType.TEXT, // Or FILE
            outputType: IOType.TEXT,
            complexity: 2,
            flags: [
                { name: '-r', description: 'Recursively search directories', effect: 'RECURSIVE' },
                { name: '-i', description: 'Ignore case distinctions', effect: 'CASE_INSENSITIVE' },
                { name: '-v', description: 'Invert match (select non-matching lines)', effect: 'INVERT' },
                { name: '-l', description: 'Print only names of FILEs with selected lines', effect: 'LIST_FILES' }
            ]
        });

        // LS
        this.register({
            name: 'ls',
            description: 'List directory contents.',
            capabilities: [CommandCapability.LIST],
            inputType: IOType.DIRECTORY,
            outputType: IOType.TEXT,
            complexity: 1,
            flags: [
                { name: '-a', description: 'Do not ignore entries starting with .', effect: 'SHOW_HIDDEN' },
                { name: '-l', description: 'Use a long listing format', effect: 'DETAILS' },
                { name: '-R', description: 'List subdirectories recursively', effect: 'RECURSIVE' }
            ]
        });

        // CD
        this.register({
            name: 'cd',
            description: 'Change the shell working directory.',
            capabilities: [CommandCapability.NAVIGATE],
            inputType: IOType.DIRECTORY,
            outputType: IOType.NONE, // Changes state, no output
            complexity: 1,
            flags: []
        });

        // RM
        this.register({
            name: 'rm',
            description: 'Remove files or directories.',
            capabilities: [CommandCapability.MODIFY, CommandCapability.DELETE],
            inputType: IOType.FILE,
            outputType: IOType.NONE,
            complexity: 2,
            flags: [
                { name: '-r', description: 'Remove directories and their contents recursively', effect: 'RECURSIVE' },
                { name: '-f', description: 'Ignore nonexistent files and arguments, never prompt', effect: 'FORCE' }
            ]
        });

        // CAT
        this.register({
            name: 'cat',
            description: 'Concatenate files and print on the standard output.',
            capabilities: [CommandCapability.READ],
            inputType: IOType.FILE,
            outputType: IOType.TEXT,
            complexity: 1,
            flags: [
                { name: '-n', description: 'Number all output lines', effect: 'NUMBER_LINES' }
            ]
        });

        // AWK
        this.register({
            name: 'awk',
            description: 'Pattern scanning and processing language.',
            capabilities: [CommandCapability.TRANSFORM, CommandCapability.FILTER],
            inputType: IOType.TEXT,
            outputType: IOType.TEXT,
            complexity: 5,
            flags: [
                { name: '-F', description: 'Define input field separator', effect: 'DELIMITER', requiresValue: true }
            ]
        });
    }

    public register(def: UnixCommandDefinition) {
        this.commands.set(def.name, def);
    }

    public getCommand(name: string): UnixCommandDefinition | undefined {
        return this.commands.get(name);
    }

    /**
     * Finds commands that match a specific capability and (optional) constraint.
     */
    public findTools(capability: CommandCapability, constraint?: string): UnixCommandDefinition[] {
        return Array.from(this.commands.values()).filter(cmd => {
            if (!cmd.capabilities.includes(capability)) return false;
            
            if (constraint) {
                // Check if any flag provides the required effect
                return cmd.flags.some(f => f.effect === constraint);
            }
            return true;
        });
    }
}
