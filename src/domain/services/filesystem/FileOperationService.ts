/**
 * FileOperationService - Domain Service
 * 
 * " The Scribe "
 * 
 * Handles low-level content operations: Reading and Writing.
 * Manages buffers, text decoding/encoding, and inode content updates.
 * 
 * Pillar: The Four-Fold Shield (Enterprise Logic)
 * Pillar: The Balanced Scale (SRP)
 */

import { Inode, S_IFDIR, S_IFREG, S_IFIFO, S_IRUSR, S_IWUSR } from '../../entities/filesystem/FileSystemTypes';
import { InodeTable } from '../../entities/filesystem/InodeTable';
import { IFileSystemNode } from '../../entities/filesystem/IFileSystemNode';
import { FileNode } from '../../entities/filesystem/FileNode';
import { DirectoryNode } from '../../entities/filesystem/DirectoryNode';
import { PermissionService } from './PermissionService';

type Dentry = IFileSystemNode;

export class FileOperationService {
    constructor(
        private inodeTable: InodeTable,
        private permissions: PermissionService,
        private updateUsage: (delta: number) => void // Callback to update global FS usage
    ) { }

    /**
     * Reads file content as a string.
     */
    public readFile(dentry: Dentry, actingUser?: { uid: number, gid: number, groups: number[] }): string {
        const inode = this.validateAccess(dentry, actingUser, S_IRUSR); // Read check

        const content = inode.content;
        if (content instanceof Uint8Array) {
            return new TextDecoder().decode(content);
        }
        return content as string;
    }

    /**
     * Reads file content as a binary buffer.
     */
    public readFileBuffer(dentry: Dentry, actingUser?: { uid: number, gid: number, groups: number[] }): Uint8Array {
        const inode = this.validateAccess(dentry, actingUser, S_IRUSR); // Read check

        const content = inode.content;
        if (content instanceof Uint8Array) {
            return content;
        }
        return new TextEncoder().encode(content as string);
    }

    /**
     * Writes content to a file.
     * Supports 'write' (truncate) and 'append' modes.
     */
    public writeFile(dentry: Dentry, content: string | Uint8Array, modeStr: 'w' | 'a' = 'w', actingUser?: { uid: number, gid: number, groups: number[] }): void {
        const inode = this.validateAccess(dentry, actingUser, S_IWUSR); // Write check

        const oldSize = inode.size;

        if (modeStr === 'w') {
            // Truncate and Overwrite
            inode.content = content;
        } else {
            // Append Mode
            const current = inode.content instanceof Uint8Array
                ? inode.content
                : new TextEncoder().encode(inode.content as string || '');

            const incoming = content instanceof Uint8Array
                ? content
                : new TextEncoder().encode(content);

            const combined = new Uint8Array(current.length + incoming.length);
            combined.set(current);
            combined.set(incoming, current.length);
            inode.content = combined;
        }

        // Update Metadata
        inode.size = (typeof inode.content === 'string') ? inode.content.length : (inode.content as Uint8Array).length;
        inode.mtime = Date.now();
        inode.ctime = Date.now();

        // Update Global Usage
        this.updateUsage(inode.size - oldSize);
    }

    /**
     * Creates a new file node and allocates an inode.
     */
    public createFile(parent: DirectoryNode, name: string, mode: number, uid: number, gid: number): Dentry {
        return this.createDentry(parent, name, S_IFREG | mode, uid, gid);
    }

    /**
     * Creates a named pipe (FIFO).
     */
    public mkfifo(parent: DirectoryNode, name: string, mode: number, uid: number, gid: number): Dentry {
        return this.createDentry(parent, name, S_IFIFO | mode, uid, gid);
    }

    /**
     * Helper to allocate inode and link dentry.
     */
    private createDentry(parent: DirectoryNode, name: string, fullMode: number, uid: number, gid: number): Dentry {
        if (parent.getChild(name)) throw new Error('File exists');

        const inode = this.inodeTable.allocate(fullMode, uid, gid);
        const newNode = new FileNode(name, inode.id, parent);

        parent.addChild(newNode);

        // Update Parent Metadata
        const parentInode = this.inodeTable.get(parent.inodeId);
        if (parentInode) {
            parentInode.mtime = Date.now();
            parentInode.ctime = Date.now();
        }

        return newNode;
    }

    /**
     * Common validation logic for Read/Write.
     */
    private validateAccess(dentry: Dentry, actingUser: { uid: number, gid: number, groups: number[] } | undefined, requiredBit: number): Inode {
        const inode = this.inodeTable.get(dentry.inodeId);
        if (!inode) throw new Error('Corrupt filesystem');

        if (inode.mode & S_IFDIR) throw new Error('Is a directory');

        if (actingUser && !this.permissions.hasAccess(inode.id, actingUser, requiredBit)) {
            throw new Error('Permission denied');
        }

        return inode;
    }
}
