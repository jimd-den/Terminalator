/**
 * FileSystem Types - Domain Layer
 *
 * Shared type definitions for the FileSystem domain.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: Universal Readability (Semantic Naming)
 */

export const S_IFMT = 0o170000;
export const S_IFSOCK = 0o140000;
export const S_IFLNK = 0o120000;
export const S_IFREG = 0o100000;
export const S_IFBLK = 0o060000;
export const S_IFDIR = 0o040000;
export const S_IFCHR = 0o020000;
export const S_IFIFO = 0o010000;

export type FileType = 'file' | 'directory' | 'symlink' | 'block' | 'char' | 'fifo' | 'socket';

export interface Inode {
    id: number;
    mode: number;    // File type and mode (permissions)
    uid: number;     // User ID
    gid: number;     // Group ID
    size: number;    // Size in bytes
    atime: number;   // Access time (ms)
    mtime: number;   // Modification time (ms)
    ctime: number;   // Change time (ms)
    links: number;   // Hard link count
    content: any;    // string for files, Map<string, number> for dirs, null for devs
    target?: string; // For symlinks
}

// Dentry represents a node in the directory tree.
// It maps a name to an Inode.
export interface Dentry {
    name: string;
    inodeId: number;
    parent: Dentry | null;
    children: Map<string, Dentry>; // Cache of children Dentries
    // mountedFS?: FileSystem; // Circular dependency if we include FileSystem type here. Removed for now or use 'any'.
}
