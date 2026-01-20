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

// Permissions
export const S_IRWXU = 0o700;
export const S_IRUSR = 0o400;
export const S_IWUSR = 0o200;
export const S_IXUSR = 0o100;
export const S_IRWXG = 0o070;
export const S_IRGRP = 0o040;
export const S_IWGRP = 0o020;
export const S_IXGRP = 0o010;
export const S_IRWXO = 0o007;
export const S_IROTH = 0o004;
export const S_IWOTH = 0o002;
export const S_IXOTH = 0o001;

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
    content: string | Uint8Array | Map<string, number> | null;    // string/buffer for files, Map for dirs, null for devs
    target?: string; // For symlinks
}

// Dentry represents a node in the directory tree.
// It maps a name to an Inode.
export interface Dentry {
    name: string;
    inodeId: number;
    parent: Dentry | null;
    children: Map<string, Dentry>; // Cache of children Dentries
    isDirectory?: boolean; // Helper property attached at runtime
    // mountedFS?: FileSystem; // Circular dependency if we include FileSystem type here. Removed for now or use 'any'.
}
