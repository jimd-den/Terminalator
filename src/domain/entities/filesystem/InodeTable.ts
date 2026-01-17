/**
 * InodeTable Entity - Domain Layer
 *
 * Manages the lifecycle and storage of File Inodes.
 * Acts as a Repository for Inodes.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Balanced Scale (SRP)
 *
 * Intent:
 * Separates "Data Storage" (InodeTable) from "Path Logic" (FileSystem/PathResolver).
 * This prevents the "God Object" anti-pattern in FileSystem.
 */

import { Inode, S_IFDIR } from './FileSystemTypes';

export class InodeTable {
    private inodes: Map<number, Inode> = new Map();
    private nextInodeId: number = 1;

    /**
     * Allocates a new Inode with the given properties.
     * Complexity: O(1)
     */
    allocate(mode: number, uid: number, gid: number): Inode {
        const now = Date.now();
        const inode: Inode = {
            id: this.nextInodeId++,
            mode: mode,
            uid: uid,
            gid: gid,
            size: 0,
            atime: now,
            mtime: now,
            ctime: now,
            links: 1,
            content: (mode & S_IFDIR) ? null : ''
        };

        if (mode & S_IFDIR) {
            inode.size = 4096;
        }

        this.inodes.set(inode.id, inode);
        return inode;
    }

    /**
     * Retrieves an Inode by ID.
     * Complexity: O(1)
     */
    get(id: number): Inode | undefined {
        return this.inodes.get(id);
    }

    /**
     * Deletes an Inode.
     * Complexity: O(1)
     */
    free(id: number): boolean {
        return this.inodes.delete(id);
    }

    /**
     * Manual registration for root inode (rare case)
     */
    register(inode: Inode): void {
        this.inodes.set(inode.id, inode);
        if (inode.id >= this.nextInodeId) {
            this.nextInodeId = inode.id + 1;
        }
    }
}
