/**
 * User.ts - Domain Entity
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * POSIX User Entity (IEEE Std 1003.1-2024)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Represents a system user as defined in <pwd.h>.
 * 
 * THE EIGHT PILLARS OF THE CRAFT:
 * 1. Strict Architecture: Pure Entity with zero external dependencies.
 * 2. Literate Documentation: Fields match POSIX passwd database.
 * 3. Dependency Minimalism: Standard TypeScript only.
 * 5. Performance: O(1) property access.
 * 6. Universal Readability: Field names follow standard Unix conventions.
 * 8. SOLID / KISS: Simple data object for user information.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export interface User {
    /**
     * User ID (UID).
     * POSIX: "A non-negative integer... that is used to identify a user."
     */
    readonly uid: number;

    /**
     * User name (Login name).
     * POSIX: "A string that is used to identify a user."
     */
    readonly username: string;

    /**
     * Primary Group ID (GID).
     * The GID of the user's primary group.
     */
    readonly gid: number;

    /**
     * Supplementary groups.
     * List of IDs of additional groups the user belongs to.
     */
    readonly groups: number[];

    /**
     * Home directory.
     * Absolute path to the user's initial working directory.
     */
    readonly home: string;

    /**
     * Initial program (Shell).
     * Path to the user's default shell.
     */
    readonly shell: string;

    /**
     * Real name or comment (GECOS).
     */
    readonly realName?: string;
}
