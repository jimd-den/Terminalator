/**
 * UnixCommandDefinition.ts
 *
 * Pillar: THE SOURCE OF TRUTH (Unix Knowledge Base)
 * Pillar: THE FOUR-FOLD SHIELD (Clean Architecture) - Domain Entities
 *
 * Intent:
 * Defines the semantic structure of a Unix command.
 * This is the schema used by the Knowledge Base to describe *what* a command does,
 * allowing the Constraint Solver to reason about tool selection.
 */

export enum CommandCapability {
    FILTER = 'FILTER',       // Reduces data (grep, head)
    TRANSFORM = 'TRANSFORM', // Modifies content (sed, tr, awk)
    NAVIGATE = 'NAVIGATE',   // Changes location (cd)
    LIST = 'LIST',           // Shows metadata (ls)
    READ = 'READ',           // Outputs content (cat)
    MODIFY = 'MODIFY',       // Changes FS state (touch, rm, mkdir)
    PERMISSION = 'PERMISSION', // Changes attributes (chmod, chown)
    SEARCH = 'SEARCH',       // Finds content (grep)
    DELETE = 'DELETE'        // Removes content (rm)
}

export enum IOType {
    TEXT = 'TEXT',
    FILE = 'FILE',
    DIRECTORY = 'DIRECTORY',
    STREAM = 'STREAM',
    NONE = 'NONE'
}

export interface UnixFlag {
    name: string;       // e.g., "-r" or "--recursive"
    description: string; // "Recursively search subdirectories"
    effect: string;      // Semantic tag (e.g., "RECURSIVE", "FORCE")
    conflictsWith?: string[]; // Flags that cannot be used with this one
    requiresValue?: boolean; // If true, expects a value (e.g., -n 5)
}

export interface UnixCommandDefinition {
    name: string;
    description: string;
    capabilities: CommandCapability[];
    
    /**
     * What kind of input does this command accept?
     */
    inputType: IOType;
    
    /**
     * What kind of output does it produce?
     */
    outputType: IOType;

    /**
     * Semantic flags supported by this command.
     */
    flags: UnixFlag[];

    /**
     * Complexity weight (1 = Basic, 10 = Arcane).
     * Used for difficulty scaling.
     */
    complexity: number;
}
