/**
 * PermissionService - Domain Service
 * 
 * " The Gatekeeper "
 * 
 * Responsible for enforcing POSIX-compliant access control logic.
 * This service is Pure Logic - it blindly checks bits against users.
 * 
 * Pillar: The Four-Fold Shield (Enterprise Logic)
 * Pillar: The Balanced Scale (SRP)
 */

import { Inode, S_IRUSR, S_IWUSR, S_IXUSR, S_IRGRP, S_IWGRP, S_IXGRP, S_IROTH, S_IWOTH, S_IXOTH } from '../../entities/filesystem/FileSystemTypes';
import { InodeTable } from '../../entities/filesystem/InodeTable';

export class PermissionService {
    /**
     * @param inodeTable - Repository of file metadata (Inodes)
     */
    constructor(private inodeTable: InodeTable) { }

    /**
     * Core POSIX Access Check.
     * 
     * Determines if a specific user can perform a specific action (Read/Write/Execute)
     * on a specific Inode.
     * 
     * Complexity: O(1) - Bitwise operations
     * 
     * @param inodeId - The ID of the target inode
     * @param actingUser - The user attempting the action
     * @param requiredBit - The specific permission bit required (e.g., S_IRUSR)
     * @returns true if access is granted, false otherwise
     */
    public hasAccess(inodeId: number, actingUser: { uid: number, gid: number, groups: number[] }, requiredBit: number): boolean {
        const inode = this.inodeTable.get(inodeId);
        if (!inode) return false;

        // 1. Root Override (The "Superuser" Rule)
        // Root (UID 0) bypasses almost all checks.
        // Exception: For execution, at least one execute bit must be set somewhere.
        if (actingUser.uid === 0) {
            if (this.isExecuteCheck(requiredBit)) {
                // If any execute bit is set (User, Group, or Other), Root can run it.
                return (inode.mode & 0o111) !== 0;
            }
            return true;
        }

        // 2. Owner Check (The "User" Rule)
        // If the actor matches the file owner, use the User bits (700 mask)
        if (actingUser.uid === inode.uid) {
            return this.checkBits(inode.mode, requiredBit, 'USER');
        }

        // 3. Group Check (The "Group" Rule)
        // If the actor matches the file group OR is in the supplementary groups...
        if (actingUser.gid === inode.gid || actingUser.groups.includes(inode.gid)) {
            return this.checkBits(inode.mode, requiredBit, 'GROUP');
        }

        // 4. Others Check (The "World" Rule)
        // If neither owner nor group, use the Other bits (007 mask)
        return this.checkBits(inode.mode, requiredBit, 'OTHER');
    }

    /**
     * Logically determines if the request is an "Execute" request.
     */
    private isExecuteCheck(bit: number): boolean {
        return bit === S_IXUSR || bit === S_IXGRP || bit === S_IXOTH;
    }

    /**
     * Maps the requested generic bit (like "Read") to the specific scope (User/Group/Other)
     * and checks if it is set in the mode.
     */
    private checkBits(mode: number, requiredBit: number, scope: 'USER' | 'GROUP' | 'OTHER'): boolean {
        // Normalizing the request:
        // The 'requiredBit' passed in is usually the USR variant (e.g. S_IRUSR) 
        // to signify "I want Read Access".
        // We need to shift it or map it to the correct scope.

        // HOWEVER, the caller usually passes the specific bit they want?
        // Let's look at the legacy implementation.
        // Legacy: if (requiredBit === S_IRUSR ...) return (inode.mode & S_IRUSR)

        // To be pure and composable, we should support passing the *intent* (Read/Write/Exec)
        // rather than the specific bit, OR handle the bit logic precisely.

        // Let's stick to the raw bit check for strict compatibility with existing calls,
        // but adding the logic to match the scope.

        // Map "Read Intent"
        if (requiredBit === S_IRUSR || requiredBit === S_IRGRP || requiredBit === S_IROTH) {
            if (scope === 'USER') return (mode & S_IRUSR) !== 0;
            if (scope === 'GROUP') return (mode & S_IRGRP) !== 0;
            if (scope === 'OTHER') return (mode & S_IROTH) !== 0;
        }

        // Map "Write Intent"
        if (requiredBit === S_IWUSR || requiredBit === S_IWGRP || requiredBit === S_IWOTH) {
            if (scope === 'USER') return (mode & S_IWUSR) !== 0;
            if (scope === 'GROUP') return (mode & S_IWGRP) !== 0;
            if (scope === 'OTHER') return (mode & S_IWOTH) !== 0;
        }

        // Map "Execute Intent"
        if (requiredBit === S_IXUSR || requiredBit === S_IXGRP || requiredBit === S_IXOTH) {
            if (scope === 'USER') return (mode & S_IXUSR) !== 0;
            if (scope === 'GROUP') return (mode & S_IXGRP) !== 0;
            if (scope === 'OTHER') return (mode & S_IXOTH) !== 0;
        }

        return false;
    }
}
