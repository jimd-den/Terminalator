/**
 * KnowledgeEntity.ts - Domain Entity
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * Knowledge Representation for the Tutor-as-Planner
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Represents a piece of information discovered or hypothesized by the Tutor.
 * This is the fundamental unit of the Tutor's "Blackboard".
 * 
 * THE EIGHT PILLARS OF THE CRAFT:
 * 1. Strict Architecture: Pure Entity with zero external dependencies.
 * 2. Literate Documentation: Explains the "Truth vs Perception" boundary.
 * 3. Dependency Minimalism: Standard TypeScript only.
 * 5. Performance: O(1) property access.
 * 6. Universal Readability: Semantic naming for domain experts.
 * 8. SOLID / KISS: Simple data object for knowledge items.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export enum KnowledgeType {
    /** IP Address of a remote or local host. */
    IP = 'IP',
    /** Hostname of a system. */
    HOSTNAME = 'HOSTNAME',
    /** Absolute or relative file system path. */
    PATH = 'PATH',
    /** Process Identifier. */
    PID = 'PID',
    /** System username. */
    USER = 'USER',
    /** Credentials or secrets. */
    CREDENTIAL = 'CREDENTIAL',
    /** System metadata or status. */
    METADATA = 'METADATA'
}

export interface KnowledgeEntity {
    /** The category of knowledge. */
    readonly type: KnowledgeType;

    /** The actual data value (e.g., "192.168.1.1", "/etc/passwd"). */
    readonly value: string;

    /** 
     * ISO 8601 timestamp or simulation tick when this was discovered. 
     * Essential for observability and telemetry.
     */
    readonly discoveredAt: number;

    /** 
     * The command or event that revealed this knowledge.
     * e.g., "ifconfig", "ls -la", "cat /etc/passwd".
     */
    readonly source: string;

    /** 
     * If true, this is a heuristic guess or a belief that hasn't been verified.
     * If false, it's an observed "Truth" from a simulation output.
     */
    readonly isBelief: boolean;

    /**
     * Optional metadata for specific types (e.g., file permissions, user UID).
     */
    readonly metadata?: Record<string, any>;
}
