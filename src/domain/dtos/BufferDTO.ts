/**
 * Buffer Data Transfer Object (DTO)
 * 
 * " The Recovered Memory "
 * 
 * Represents a captured terminal session (command + output) for the Archive/Buffer UI.
 * This simple structure ensures the UI only receives what it needs to render.
 * 
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Storyteller's Code (Literate Documentation)
 */

export interface BufferDTO {
    /** Unique ID for React lists and deletion */
    id: string;

    /** When this command was executed */
    timestamp: number;

    /** The command string entered by the operator */
    command: string;

    /** The output lines produced by the system */
    output: string[];

    /** Categorical tags (e.g., 'network', 'error') for filtering */
    tags: string[];

    /** The system hostname where this occurred */
    hostname: string;

    /** 
     * The numeric exit code (0 = Success, >0 = Error).
     * Optional because not all captures may have one preserved.
     */
    exitCode?: number;
}
