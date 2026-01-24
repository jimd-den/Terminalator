/**
 * DirectoryNode.ts
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: Pragmatic Design Patterns (Composite)
 *
 * Intent:
 * Represents a directory in the VFS. Manages child nodes.
 * Contains NO filesystem metadata (permissions, timestamps) - that lives in the Inode.
 */

import { IFileSystemNode } from './IFileSystemNode';

export class DirectoryNode implements IFileSystemNode {
    public name: string;
    public readonly inodeId: number;
    public parent: IFileSystemNode | null;
    public children: Map<string, IFileSystemNode>;

    constructor(name: string, inodeId: number, parent: IFileSystemNode | null = null) {
        this.name = name;
        this.inodeId = inodeId;
        this.parent = parent;
        this.children = new Map();
    }

    public isDirectory(): boolean {
        return true;
    }

    public addChild(node: IFileSystemNode): void {
        this.children.set(node.name, node);
        node.parent = this;
    }

    public removeChild(name: string): boolean {
        return this.children.delete(name);
    }

    public getChild(name: string): IFileSystemNode | undefined {
        return this.children.get(name);
    }

    public accept(visitor: any): void {
        if (visitor.visitDirectory) visitor.visitDirectory(this);
    }
}
