/**
 * SystemPreparationSpec.ts
 *
 * Pillar: The Four-Fold Shield (Clean Architecture) - Domain Entities
 * Pillar: The Storyteller’s Code (Literate Documentation)
 *
 * Intent:
 * A pure data structure describing the mutations required on a system 
 * (FileSystem, Logs, Devices) to support a specific mission instance.
 * Replaces the procedural logic in SystemPreparationService.
 *
 * Why: To decouple the "What" (world requirements) from the "How" (FS manipulation).
 */

export interface FileSpec {
    /**
     * Absolute or relative path (within target system) to the file.
     */
    path: string;
    
    /**
     * Optional ID of a pre-defined content template.
     */
    contentTemplateId?: string;
    
    /**
     * Literal string content to write if no template is used.
     */
    rawContent?: string;
    
    /**
     * Variables for string interpolation within the template or raw content.
     */
    params?: Record<string, string | number>;
    
    /**
     * Unix file permissions (e.g., 0o644).
     */
    mode?: number;
    
    /**
     * Optional owner username.
     */
    owner?: string;
}

export interface LogSpec {
    /**
     * Path to the log file (e.g., '/var/log/syslog').
     */
    path: string;
    
    /**
     * The schema/format of the log.
     */
    type?: 'ACCESS' | 'INCIDENT' | 'UNIT';
    
    /**
     * Total number of lines to generate.
     */
    lineCount: number;
    
    /**
     * Probability of a line being an error line.
     */
    errorRate: number; 
    
    /**
     * The specific diagnostic phrase or secret the player must find.
     */
    keyPhrase: string;
}

export interface RISCVMemorySpec {
    /**
     * Path to the binary file to be "mounted" or loaded into memory.
     */
    path: string; 
    
    /**
     * Memory offset for the image.
     */
    baseAddress: number;
    
    /**
     * Total reserved size in bytes.
     */
    size: number;
}

/**
 * The full specification for patching a system state.
 */
export interface SystemPreparationSpec {
    /**
     * The unique hostname of the target system.
     */
    hostname: string;
    
    /**
     * Directories that must exist for the mission.
     */
    requiredDirs: string[];
    
    /**
     * Files to be created or modified.
     */
    files: FileSpec[];
    
    /**
     * Log files to be populated with procedural noise and targets.
     */
    logs: LogSpec[];
    
    /**
     * Optional hardware/firmware images for RISC-V missions.
     */
    riscvMemoryImages?: RISCVMemorySpec[];
}
