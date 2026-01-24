/**
 * FileNode.ts
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: Pragmatic Design Patterns (Composite)
 *
 * Intent:
 * Represents a file (or special file) in the VFS.
 * CRITICAL: Stores NO content or metadata. Effectively a named hard link to an Inode.
 */

import { IFileSystemNode } from './IFileSystemNode';

export class FileNode implements IFileSystemNode {
    public name: string;
    public readonly inodeId: number;
    public parent: IFileSystemNode | null;

    constructor(name: string, inodeId: number, parent: IFileSystemNode | null = null) {
        this.name = name;
        this.inodeId = inodeId;
        this.parent = parent;
    }

    public isDirectory(): boolean {
        return false;
    }

    public accept(visitor: any): void {
        if (visitor.visitFile) visitor.visitFile(this);
    }
}
