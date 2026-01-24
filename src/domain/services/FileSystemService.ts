/**
 * FileSystemService - Domain Service
 *
 * Implements POSIX-compliant filesystem operations.
 * Separates logic from the FileSystem entity (state).
 *
 * Pillar: The Four-Fold Shield (Use Case/Service Layer)
 */

import { FileSystem, Dentry, S_IFDIR, S_IFREG, S_IFLNK, S_IFMT, S_IFIFO, Inode, S_IRUSR, S_IWUSR, S_IXUSR, S_IRGRP, S_IWGRP, S_IXGRP, S_IROTH, S_IWOTH, S_IXOTH } from '../entities/FileSystem';
import { PathResolver } from './filesystem/PathResolver';

export class FileSystemService {
    private pathResolver: PathResolver;

    constructor(private fs: FileSystem) {
        this.pathResolver = new PathResolver(fs.inodeTable);
    }

    get fileSystem(): FileSystem {
        return this.fs;
    }

    /**
     * Traverses the file system to find a node by path.
     */
    resolve(path: string, cwd: string = '/', followSymlinks: boolean = true, actingUser?: { uid: number, gid: number, groups: number[] }): Dentry | null {
        return this.pathResolver.resolve(this.fs.root, path, cwd, followSymlinks, actingUser);
    }

    /**
     * pure: Resolves a path string to an absolute, normalized path.
     * Does not check for existence.
     * 
     * @param path The path to resolve (relative or absolute)
     * @param cwd The current working directory (absolute)
     * @returns Normalized absolute path
     */
    resolveAbsolutePath(path: string, cwd: string): string {
        // 1. Handle absolute vs relative
        let absolutePath = path.startsWith('/') ? path : (cwd === '/' ? `/${path}` : `${cwd}/${path}`);

        // 2. Split and Normalize
        const parts = absolutePath.split('/').filter(p => p.length > 0 && p !== '.');
        const stack: string[] = [];

        for (const part of parts) {
            if (part === '..') {
                stack.pop();
            } else {
                stack.push(part);
            }
        }

        // 3. Reconstruct
        return '/' + stack.join('/');
    }

    getAbsolutePath(dentry: Dentry): string {
        return this.pathResolver.getAbsolutePath(dentry);
    }

    getInode(id: number): Inode | undefined {
        return this.fs.inodeTable.get(id);
    }

    private createInode(mode: number, uid: number, gid: number): Inode {
        const inode = this.fs.inodeTable.allocate(mode, uid, gid);
        if (mode & S_IFDIR) {
            this.fs.usedBytes += 4096;
        }
        return inode;
    }

    mkdir(path: string, mode: number = 0o755, uid: number = 1000, gid: number = 1000, cwd: string = '/'): Dentry {
        return this.createDentry(path, S_IFDIR | mode, uid, gid, cwd);
    }

    /**
     * Recursive mkdir. Creates directories if they don't exist.
     */
    public mkdirp(path: string, mode: number = 0o755, uid: number = 1000, gid: number = 1000, cwd: string = '/'): Dentry {
        const isAbsolute = path.startsWith('/');
        let targetPath = path;

        // Simple manual resolution for iteration
        // Note: verify real path resolution rules if we had complex CWD handling (e.g. ..)
        // For system initialization, safely generic.
        if (!isAbsolute) {
            targetPath = cwd === '/' ? `/${path}` : `${cwd}/${path}`;
        }

        // Clean double slashes if any (naive)
        targetPath = targetPath.replace(/\/\//g, '/');

        if (targetPath === '/') return this.fs.root;

        const parts = targetPath.split('/').filter(p => p.length > 0);
        let currentPath = '';

        let lastDentry = this.fs.root;

        for (const part of parts) {
            currentPath += `/${part}`;
            const existing = this.resolve(currentPath);
            if (existing) {
                lastDentry = existing;
                const inode = this.getInode(lastDentry.inodeId);
                if (inode && !(inode.mode & S_IFDIR)) {
                    throw new Error(`mkdirp: cannot create directory '${currentPath}': Not a directory`);
                }
            } else {
                lastDentry = this.mkdir(currentPath, mode, uid, gid);
            }
        }
        return lastDentry;
    }

    /**
     * Alias for mkdirp (Tutor/System usage)
     */
    public createDirectory(path: string, mode: number = 0o755, uid: number = 1000, gid: number = 1000, cwd: string = '/'): Dentry {
        return this.mkdirp(path, mode, uid, gid, cwd);
    }

    createFile(path: string, mode: number = 0o644, uid: number = 1000, gid: number = 1000, cwd: string = '/'): Dentry {
        return this.createDentry(path, S_IFREG | mode, uid, gid, cwd);
    }

    mkfifo(path: string, mode: number = 0o644, uid: number = 1000, gid: number = 1000, cwd: string = '/'): Dentry {
        return this.createDentry(path, S_IFIFO | mode, uid, gid, cwd);
    }

    symlink(target: string, linkPath: string, uid: number = 1000, gid: number = 1000, cwd: string = '/'): Dentry {
        const dentry = this.createDentry(linkPath, S_IFLNK | 0o777, uid, gid, cwd);
        const inode = this.getInode(dentry.inodeId)!;
        inode.target = target;
        inode.size = target.length;
        this.fs.usedBytes += target.length;
        return dentry;
    }

    /**
     * Checks if the given user has the required permissions on the inode.
     * 
     * @param inodeId - The ID of the inode to check.
     * @param actingUser - The user attempting access.
     * @param requiredBit - The permission bit required (e.g., S_IRUSR, S_IWUSR, S_IXUSR).
     * @returns True if access is granted, false otherwise.
     */
    public hasAccess(inodeId: number, actingUser: { uid: number, gid: number, groups: number[] }, requiredBit: number): boolean {
        const inode = this.getInode(inodeId);
        if (!inode) return false;

        // 1. Root Override
        if (actingUser.uid === 0) {
            // Root can read/write anything.
            // For execute, root needs at least one execute bit set on the file.
            if (requiredBit === S_IXUSR || requiredBit === S_IXGRP || requiredBit === S_IXOTH) {
                return (inode.mode & 0o111) !== 0;
            }
            return true;
        }

        // 2. Owner Check
        if (actingUser.uid === inode.uid) {
            if (requiredBit === S_IRUSR || requiredBit === S_IRGRP || requiredBit === S_IROTH) return (inode.mode & S_IRUSR) !== 0;
            if (requiredBit === S_IWUSR || requiredBit === S_IWGRP || requiredBit === S_IWOTH) return (inode.mode & S_IWUSR) !== 0;
            if (requiredBit === S_IXUSR || requiredBit === S_IXGRP || requiredBit === S_IXOTH) return (inode.mode & S_IXUSR) !== 0;
        }

        // 3. Group Check
        if (actingUser.gid === inode.gid || actingUser.groups.includes(inode.gid)) {
            if (requiredBit === S_IRUSR || requiredBit === S_IRGRP || requiredBit === S_IROTH) return (inode.mode & S_IRGRP) !== 0;
            if (requiredBit === S_IWUSR || requiredBit === S_IWGRP || requiredBit === S_IWOTH) return (inode.mode & S_IWGRP) !== 0;
            if (requiredBit === S_IXUSR || requiredBit === S_IXGRP || requiredBit === S_IXOTH) return (inode.mode & S_IXGRP) !== 0;
        }

        // 4. Others Check
        if (requiredBit === S_IRUSR || requiredBit === S_IRGRP || requiredBit === S_IROTH) return (inode.mode & S_IROTH) !== 0;
        if (requiredBit === S_IWUSR || requiredBit === S_IWGRP || requiredBit === S_IWOTH) return (inode.mode & S_IWOTH) !== 0;
        if (requiredBit === S_IXUSR || requiredBit === S_IXGRP || requiredBit === S_IXOTH) return (inode.mode & S_IXOTH) !== 0;

        return false;
    }

    link(oldPath: string, newPath: string, cwd: string = '/'): Dentry {
        // Resolve oldPath
        const oldDentry = this.resolve(oldPath, cwd);
        if (!oldDentry) throw new Error(`link: cannot access '${oldPath}': No such file or directory`);

        const inode = this.getInode(oldDentry.inodeId);
        if (!inode) throw new Error('Corrupt filesystem');
        if (inode.mode & S_IFDIR) throw new Error(`link: '${oldPath}': Hard link to directory not allowed`);

        const isAbsolute = newPath.startsWith('/');
        const parts = newPath.split('/').filter(p => p.length > 0);

        if (parts.length === 0) throw new Error('Invalid newPath');

        const newName = parts.pop()!;
        const dirPath = (isAbsolute ? '/' : '') + parts.join('/');

        let parent: Dentry | null;

        if (parts.length === 0 && !isAbsolute) {
            parent = this.resolve(cwd);
        } else if (parts.length === 0 && isAbsolute) {
            parent = this.fs.root;
        } else {
            parent = this.resolve(dirPath, cwd);
        }

        if (!parent) throw new Error(`link: cannot create link '${newPath}': No such file or directory`);
        if (parent.children.has(newName)) throw new Error(`link: failed to create link '${newPath}': File exists`);

        const dentry: Dentry = {
            name: newName,
            inodeId: inode.id,
            parent: parent,
            children: new Map()
        };

        parent.children.set(newName, dentry);
        inode.links++;
        inode.ctime = Date.now();

        return dentry;
    }

    readlink(path: string, cwd: string = '/'): string {
        const dentry = this.resolve(path, cwd, false); // false = don't follow final
        if (!dentry) throw new Error(`readlink: cannot access '${path}': No such file or directory`);
        const inode = this.getInode(dentry.inodeId)!;
        if (!(inode.mode & S_IFLNK)) throw new Error(`readlink: '${path}': Invalid argument`);
        return inode.target || '';
    }

    private createDentry(path: string, mode: number, uid: number, gid: number, cwd: string): Dentry {
        let parent: Dentry | null = null;
        let name: string;

        const isAbsolute = path.startsWith('/');
        const parts = path.split('/').filter(p => p.length > 0);

        if (parts.length === 0) throw new Error('Invalid path');

        name = parts.pop()!; // last part is name
        const dirPath = (isAbsolute ? '/' : '') + parts.join('/');

        if (parts.length === 0 && !isAbsolute) {
            parent = this.resolve(cwd);
        } else if (parts.length === 0 && isAbsolute) {
            parent = this.fs.root;
        } else {
            parent = this.resolve(dirPath, cwd);
        }

        if (!parent) throw new Error(`Cannot create '${path}': Parent directory not found`);

        const parentInode = this.getInode(parent.inodeId);
        if (!parentInode || !(parentInode.mode & S_IFDIR)) throw new Error(`Cannot create '${path}': Parent is not a directory`);

        if (parent.children.has(name)) throw new Error(`Cannot create '${path}': File exists`);

        const inode = this.createInode(mode, uid, gid);

        const dentry: Dentry = {
            name: name,
            inodeId: inode.id,
            parent: parent,
            children: new Map()
        };
        this.fs.attachDentryHelpers(dentry);
        // Ideally strict entity shouldn't have helpers but for now relying on existing one to minimize breakage

        parent.children.set(name, dentry);

        if (mode & S_IFDIR) {
            parentInode.links++;
        }

        parentInode.mtime = Date.now();
        parentInode.ctime = Date.now();

        return dentry;
    }

    writeFile(path: string, content: string | Uint8Array, modeStr: 'w' | 'a' = 'w', uid: number = 1000, gid: number = 1000, cwd: string = '/', actingUser?: { uid: number, gid: number, groups: number[] }): Dentry {
        let dentry = this.resolve(path, cwd, true, actingUser);
        let inode: Inode;

        if (!dentry) {
            dentry = this.createFile(path, 0o644, uid, gid, cwd);
            inode = this.getInode(dentry.inodeId)!;
        } else {
            inode = this.getInode(dentry.inodeId)!;
            if (inode.mode & S_IFDIR) throw new Error(`Cannot write to '${path}': Is a directory`);

            // Check Write Permission
            if (actingUser && !this.hasAccess(inode.id, actingUser, S_IWUSR)) {
                throw new Error('Permission denied');
            }
        }

        const oldSize = inode.size;

        if (modeStr === 'w') {
            inode.content = content;
        } else {
            // Append logic
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

        inode.size = (typeof inode.content === 'string') ? inode.content.length : (inode.content as Uint8Array).length;
        this.fs.usedBytes += (inode.size - oldSize);

        inode.mtime = Date.now();
        inode.ctime = Date.now();

        return dentry;
    }

    readFile(path: string, cwd: string = '/', actingUser?: { uid: number, gid: number, groups: number[] }): string {
        const dentry = this.resolve(path, cwd, true, actingUser);
        if (!dentry) throw new Error(`${path}: No such file or directory`);
        const inode = this.getInode(dentry.inodeId);
        if (!inode) throw new Error('Corrupt filesystem');
        if (inode.mode & S_IFDIR) throw new Error(`${path}: Is a directory`);

        // Check Read Permission
        if (actingUser && !this.hasAccess(inode.id, actingUser, S_IRUSR)) {
            throw new Error('Permission denied');
        }

        const content = inode.content;
        if (content instanceof Uint8Array) {
            return new TextDecoder().decode(content);
        }
        return content as string;
    }

    readFileBuffer(path: string, cwd: string = '/', actingUser?: { uid: number, gid: number, groups: number[] }): Uint8Array {
        const dentry = this.resolve(path, cwd, true, actingUser);
        if (!dentry) throw new Error(`${path}: No such file or directory`);
        const inode = this.getInode(dentry.inodeId);
        if (!inode) throw new Error('Corrupt filesystem');
        if (inode.mode & S_IFDIR) throw new Error(`${path}: Is a directory`);

        // Check Read Permission
        if (actingUser && !this.hasAccess(inode.id, actingUser, S_IRUSR)) {
            throw new Error('Permission denied');
        }

        const content = inode.content;
        if (content instanceof Uint8Array) {
            return content;
        }
        return new TextEncoder().encode(content as string);
    }

    deleteNode(path: string, cwd: string = '/', actingUser?: { uid: number, gid: number, groups: number[] }): void {
        const dentry = this.resolve(path, cwd, false, actingUser);
        if (!dentry) throw new Error(`rm: cannot remove '${path}': No such file or directory`);
        if (!dentry.parent) throw new Error(`rm: cannot remove root`);

        // To delete a node, we need write + execute permission on the PARENT directory
        if (actingUser) {
            const parentInode = this.getInode(dentry.parent.inodeId);
            if (parentInode) {
                if (!this.hasAccess(parentInode.id, actingUser, S_IWUSR) || !this.hasAccess(parentInode.id, actingUser, S_IXUSR)) {
                    throw new Error('Permission denied');
                }
            }
        }

        const inode = this.getInode(dentry.inodeId)!;
        if ((inode.mode & S_IFDIR) && dentry.children.size > 0) {
            throw new Error(`rm: cannot remove '${path}': Directory not empty`);
        }

        dentry.parent.children.delete(dentry.name);
        inode.links--;

        const parentInode = this.getInode(dentry.parent.inodeId);
        if (parentInode) parentInode.mtime = Date.now();

        if (inode.links <= 0) {
            this.fs.usedBytes -= inode.size;
            this.fs.inodeTable.free(inode.id);
        }
    }

    chmod(path: string, mode: number, cwd: string = '/', actingUser?: { uid: number, gid: number, groups: number[] }): void {
        const dentry = this.resolve(path, cwd, true, actingUser);
        if (!dentry) throw new Error(`chmod: cannot access '${path}': No such file or directory`);
        const inode = this.getInode(dentry.inodeId)!;

        // Check ownership: only owner or root can chmod
        if (actingUser && actingUser.uid !== 0 && actingUser.uid !== inode.uid) {
            throw new Error('Operation not permitted');
        }

        const typeMask = S_IFMT;
        const permMask = ~S_IFMT;
        inode.mode = (inode.mode & typeMask) | (mode & permMask);
        inode.ctime = Date.now();
    }

    chown(path: string, uid: number, gid: number, cwd: string = '/', actingUser?: { uid: number, gid: number, groups: number[] }): void {
        const dentry = this.resolve(path, cwd, true, actingUser);
        if (!dentry) throw new Error(`chown: cannot access '${path}': No such file or directory`);
        const inode = this.getInode(dentry.inodeId)!;

        // Check ownership: only root can chown (POSIX restricted mode)
        if (actingUser && actingUser.uid !== 0) {
            // Non-root can only change their own files
            if (actingUser.uid !== inode.uid) {
                throw new Error('Operation not permitted');
            }

            // Non-root owner can change GID to a group they belong to
            if (gid !== -1 && gid !== inode.gid) {
                if (actingUser.gid !== gid && !actingUser.groups.includes(gid)) {
                    throw new Error('Operation not permitted');
                }
            }

            // Non-root owner CANNOT change UID (restricted mode)
            if (uid !== -1 && uid !== inode.uid) {
                throw new Error('Operation not permitted');
            }
        }

        if (uid !== -1) inode.uid = uid;
        if (gid !== -1) inode.gid = gid;
        inode.ctime = Date.now();
    }

    rename(oldPath: string, newPath: string, cwd: string = '/'): void {
        const oldDentry = this.resolve(oldPath, cwd, false);
        if (!oldDentry) throw new Error(`rename: cannot access '${oldPath}': No such file or directory`);
        if (!oldDentry.parent) throw new Error(`rename: cannot move root`);

        const existing = this.resolve(newPath, cwd, false);
        if (existing) {
            this.deleteNode(newPath, cwd);
        }

        let newParent: Dentry | null = null;
        let newName: string;

        const isAbsolute = newPath.startsWith('/');
        const parts = newPath.split('/').filter(p => p.length > 0);
        if (parts.length === 0 && !isAbsolute) {
            newParent = this.resolve(cwd);
            newName = newPath;
        } else {
            newName = parts.pop()!;
            const dirPart = (isAbsolute ? '/' : '') + parts.join('/');
            if (parts.length === 0 && isAbsolute) newParent = this.fs.root;
            else if (parts.length === 0 && !isAbsolute) newParent = this.resolve(cwd);
            else newParent = this.resolve(dirPart, cwd);
        }

        if (!newParent) throw new Error(`rename: cannot move to '${newPath}': Parent not found`);
        const parentInode = this.getInode(newParent.inodeId);
        if (!parentInode || !(parentInode.mode & S_IFDIR)) throw new Error(`rename: '${newPath}': Parent not a directory`);

        oldDentry.parent.children.delete(oldDentry.name);

        oldDentry.parent = newParent;
        oldDentry.name = newName;
        newParent.children.set(newName, oldDentry);

        const inode = this.getInode(oldDentry.inodeId);
        if (inode) inode.ctime = Date.now();
    }
    isDirectory(dentry: Dentry): boolean {
        const inode = this.getInode(dentry.inodeId);
        return inode ? (inode.mode & S_IFDIR) === S_IFDIR : false;
    }

    /*
     * Returns file status information similar to stat(2)
     */
    getStat(dentry: Dentry) {
        const inode = this.getInode(dentry.inodeId);
        if (!inode) return null;
        return {
            size: inode.size,
            mode: inode.mode,
            uid: inode.uid,
            gid: inode.gid,
            mtime: inode.mtime,
            atime: inode.atime,
            ctime: inode.ctime,
            isDirectory: (inode.mode & S_IFDIR) === S_IFDIR,
            isFile: (inode.mode & S_IFREG) === S_IFREG,
            isSymlink: (inode.mode & S_IFLNK) === S_IFLNK
        };
    }

    getUsage(): number {
        return this.fs.usedBytes;
    }
}
