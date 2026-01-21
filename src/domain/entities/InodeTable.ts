/**
 * InodeTable Entity
 * 
 * Manages the collection of Inodes in the filesystem.
 * Separation of concerns: Handles allocation and retrieval.
 */

export interface Inode {
    id: number;
    mode: number;
    uid: number;
    gid: number;
    size: number;
    links: number;
    mtime: number;
    ctime: number;
    atime: number;
    content: string | Uint8Array | null;
    target?: string; // For symlinks
}

export class InodeTable {
    private inodes: Map<number, Inode> = new Map();
    private nextId: number = 1;

    allocate(mode: number, uid: number, gid: number): Inode {
        const id = this.nextId++;
        const now = Date.now();
        const inode: Inode = {
            id,
            mode,
            uid,
            gid,
            size: 0,
            links: 1,
            mtime: now,
            ctime: now,
            atime: now,
            content: null
        };
        this.inodes.set(id, inode);
        return inode;
    }

    get(id: number): Inode | undefined {
        return this.inodes.get(id);
    }

    free(id: number): boolean {
        return this.inodes.delete(id);
    }

    // Helper for debug/serialization
    getAll(): Inode[] {
        return Array.from(this.inodes.values());
    }
}
