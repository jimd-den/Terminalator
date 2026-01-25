/**
 * IFileSystemNode.ts
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: Pragmatic Design Patterns (Composite)
 *
 * Intent:
 * Defines the contract for a node in the Virtual File System (VFS) tree.
 * Implementations (DirectoryNode, FileNode) will form the directory structure,
 * while delegation to InodeTable handles the actual data.
 */

export interface IFileSystemNode {
    /**
     * The name of this node (e.g. "bin", "home").
     */
    name: string;

    /**
     * The Inode ID backing this node.
     * Required for POSIX operations (stat, chmod, etc).
     */
    readonly inodeId: number;

    /**
     * Parent directory node. Null if root.
     */
    parent: IFileSystemNode | null;

    /**
     * Type guard for Directory checks.
     */
    isDirectory(): boolean;

    /**
     * Visitor Pattern hook for tree traversal operations (find, tree, ls -R).
     */
    accept(visitor: any): void; // Type generic for now until IFileSystemVisitor is defined
}
