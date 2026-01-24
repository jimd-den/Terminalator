/**
 * Group.ts - Domain Entity
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * POSIX Group Entity (IEEE Std 1003.1-2024)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Represents a system group as defined in <grp.h>.
 * 
 * THE EIGHT PILLARS OF THE CRAFT:
 * 1. Strict Architecture: Pure Entity with zero external dependencies.
 * 2. Literate Documentation: Fields match POSIX group database.
 * 3. Dependency Minimalism: Standard TypeScript only.
 * 5. Performance: O(1) property access.
 * 6. Universal Readability: Field names follow standard Unix conventions.
 * 8. SOLID / KISS: Simple data object for group information.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export interface Group {
    /**
     * Group ID (GID).
     * POSIX: "A non-negative integer... that is used to identify a group."
     */
    readonly gid: number;

    /**
     * Group name.
     * POSIX: "A string that is used to identify a group."
     */
    readonly groupname: string;

    /**
     * Group members.
     * List of usernames belonging to this group.
     */
    readonly members: string[];
}
