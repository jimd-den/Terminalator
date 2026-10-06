import { ProcessContext } from '../../entities/ProcessContext';
import {
    S_IFMT, S_IFREG, S_IFDIR, S_IFLNK, S_IFCHR, S_IFBLK, S_IFIFO, S_IFSOCK
} from '../../entities/FileSystem';
import { Inode } from '../../entities/filesystem/FileSystemTypes';

export type FileKind = 'regular' | 'directory' | 'symlink' | 'char' | 'block' | 'fifo' | 'socket';

export interface FileInfo {
    path: string;
    inode: Inode;
    kind: FileKind;
}

export function kindOf(mode: number): FileKind {
    switch (mode & S_IFMT) {
        case S_IFDIR: return 'directory';
        case S_IFLNK: return 'symlink';
        case S_IFCHR: return 'char';
        case S_IFBLK: return 'block';
        case S_IFIFO: return 'fifo';
        case S_IFSOCK: return 'socket';
        case S_IFREG:
        default: return 'regular';
    }
}

/**
 * stat()/lstat() for utilities: resolves `path` relative to the process cwd.
 * Returns null when the file does not exist (or a component is inaccessible).
 */
export function statPath(context: ProcessContext, path: string, follow = true): FileInfo | null {
    const fs = context.fileSystemService;
    try {
        const abs = fs.resolveAbsolutePath(path, context.cwd);
        const node = fs.resolve(abs, '/', follow);
        if (!node) return null;
        const inode = fs.getInode(node.inodeId);
        if (!inode) return null;
        return { path: abs, inode, kind: kindOf(inode.mode) };
    } catch {
        return null;
    }
}

/** access(2): R_OK=4, W_OK=2, X_OK=1, evaluated for the process user. */
export function canAccess(context: ProcessContext, info: FileInfo, bit: 4 | 2 | 1): boolean {
    return context.fileSystemService.hasAccess(info.inode.id, context.user, bit);
}
