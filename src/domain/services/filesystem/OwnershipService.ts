/**
 * OwnershipService - Domain Service
 * 
 * " The Administrator "
 * 
 * Handles changes to file metadata: ownership (chown/chgrp) and permissions (chmod).
 * Enforces strict POSIX rules regarding who can change what.
 * 
 * Pillar: The Four-Fold Shield (Enterprise Logic)
 * Pillar: The Balanced Scale (SRP)
 */

import { Inode, S_IFMT } from '../../entities/filesystem/FileSystemTypes';
import { InodeTable } from '../../entities/filesystem/InodeTable';
import { IFileSystemNode } from '../../entities/filesystem/IFileSystemNode';

type Dentry = IFileSystemNode;

export class OwnershipService {
    constructor(private inodeTable: InodeTable) { }

    /**
     * Changes the file mode (permissions).
     * 
     * Logic:
     * - Only the Owner or Root can change permissions.
     * - Preserves the File Type bits (S_IFMT).
     * 
     * @param dentry - The file entry
     * @param mode - The new mode (permissions part only usually)
     * @param actingUser - The user attempting the change
     */
    public chmod(dentry: Dentry, mode: number, actingUser?: { uid: number, gid: number, groups: number[] }): void {
        const inode = this.inodeTable.get(dentry.inodeId);
        if (!inode) throw new Error('Corrupt filesystem: Inode not found');

        // Security Check
        if (actingUser && actingUser.uid !== 0 && actingUser.uid !== inode.uid) {
            throw new Error('Operation not permitted');
        }

        // Bitwise Logic:
        // typeMask keeps the "File Type" (Directory/File/Link)
        // permMask clears the "Permissions" so we can set new ones
        const typeMask = S_IFMT;
        const permMask = ~S_IFMT;

        inode.mode = (inode.mode & typeMask) | (mode & permMask);
        inode.ctime = Date.now();
    }

    /**
     * Changes ownership (User ID and Group ID).
     * 
     * Logic:
     * - Only Root can change UID (in strict POSIX / restricted chown environments).
     * - Owners can only change GID to a group they belong to.
     * 
     * @param dentry - The file entry
     * @param uid - New User ID (-1 to keep current)
     * @param gid - New Group ID (-1 to keep current)
     * @param actingUser - The user attempting the change
     */
    public chown(dentry: Dentry, uid: number, gid: number, actingUser?: { uid: number, gid: number, groups: number[] }): void {
        const inode = this.inodeTable.get(dentry.inodeId);
        if (!inode) throw new Error('Corrupt filesystem: Inode not found');

        if (actingUser && actingUser.uid !== 0) {
            // Non-root Safety Checks

            // 1. Must own the file to change anything
            if (actingUser.uid !== inode.uid) {
                throw new Error('Operation not permitted');
            }

            // 2. Cannot give away ownership (change UID)
            if (uid !== -1 && uid !== inode.uid) {
                throw new Error('Operation not permitted');
            }

            // 3. Can only change GID to one of their own groups
            if (gid !== -1 && gid !== inode.gid) {
                if (actingUser.gid !== gid && !actingUser.groups.includes(gid)) {
                    throw new Error('Operation not permitted');
                }
            }
        }

        // Apply Changes
        if (uid !== -1) inode.uid = uid;
        if (gid !== -1) inode.gid = gid;

        inode.ctime = Date.now();
    }
}
