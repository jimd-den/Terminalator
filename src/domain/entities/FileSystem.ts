/**
 * FileSystem Entity - Domain Layer
 * 
 * A simulated POSIX-compliant file system.
 * Supports a tree structure of files, directories, symlinks, and hard links.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture) - Entities
 * Pillar: The Balanced Scale (SOLID / KISS) - Simple Tree Structure
 *
 * Intent:
 * Provides the persistent state of the virtual world.
 * Allows commands to manipulate files and directories.
 */

// File Mode Constants (POSIX Standard)
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
    mountedFS?: FileSystem; // For future mounting support
}

export class FileSystem {
    private inodes: Map<number, Inode> = new Map();
    private nextInodeId: number = 1;
    private usedBytes: number = 0;
    root: Dentry;

    constructor() {
        // Create Root Inode (ID 1)
        const now = Date.now();
        const rootInode: Inode = {
            id: this.nextInodeId++,
            mode: S_IFDIR | 0o755,
            uid: 0,
            gid: 0,
            size: 4096,
            atime: now,
            mtime: now,
            ctime: now,
            links: 2, // . and ..
            content: null
        };
        this.inodes.set(rootInode.id, rootInode);
        this.usedBytes += 4096;

        // Create Root Dentry
        this.root = {
            name: '/',
            inodeId: rootInode.id,
            parent: null,
            children: new Map(),
        };

        this.initializeDefaultStructure();
    }

    getUsage(): number {
        return this.usedBytes;
    }

    /**
     * Traverses the file system to find a node by path.
     * Follows symlinks by default.
     *
     * @param path - The absolute or relative path to the node.
     * @returns The Dentry if found, otherwise null.
     */
    getNode(path: string): Dentry | null {
        return this.resolve(path);
    }

    // Alias for compatibility/readability
    resolveNode(path: string, cwd: string = '/'): Dentry | null {
        return this.resolve(path, cwd);
    }

    resolve(path: string, cwd: string = '/', followSymlinks: boolean = true): Dentry | null {
        if (!path) return null;
        // this.log(`resolve(${path}, ${cwd})`); // Verbose

        // Handle root special case
        if (path === '/') return this.root;

        let startNode: Dentry;
        if (path.startsWith('/')) {
            startNode = this.root;
        } else {
            // Recursive resolve of cwd should NOT follow symlinks indefinitely or cyclic? 
            // CWD is typically resolved literal path in simulated shell, but here we resolve it.
            const cwdPath = cwd === '/' ? '/' : (cwd.startsWith('/') ? cwd : '/' + cwd);
            const cwdNode = this.resolve(cwdPath, '/', true);
            if (!cwdNode) return null;
            startNode = cwdNode;
        }

        const parts = path.split('/').filter(p => p.length > 0 && p !== '.');
        let current = startNode;
        let symlinkCount = 0;
        const MAX_SYMLINKS = 40;

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];

            if (part === '..') {
                if (current.parent) {
                    current = current.parent;
                }
            } else {
                const next = current.children.get(part);
                if (!next) {
                    return null;
                }

                // Check if Symlink
                const inode = this.getInode(next.inodeId);
                // Only follow if requested AND it is a symlink
                if (followSymlinks && inode && (inode.mode & S_IFLNK) && inode.target) {
                    if (symlinkCount++ > MAX_SYMLINKS) throw new Error('Too many levels of symbolic links');

                    const target = inode.target;
                    let targetNode: Dentry | null;

                    if (target.startsWith('/')) {
                        targetNode = this.resolve(target, '/', true);
                    } else {
                        const currentAbs = this.getAbsolutePath(current);
                        targetNode = this.resolve(target, currentAbs, true);
                    }

                    if (!targetNode) return null;
                    current = targetNode;
                } else {
                    current = next;
                }
            }
        }

        return current;
    }

    getAbsolutePath(dentry: Dentry): string {
        const parts: string[] = [];
        let current: Dentry | null = dentry;
        while (current && current.parent) {
            parts.unshift(current.name);
            current = current.parent;
        }
        return parts.length === 0 ? '/' : '/' + parts.join('/');
    }

    getInode(id: number): Inode | undefined {
        return this.inodes.get(id);
    }

    createInode(mode: number, uid: number, gid: number): Inode {
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
        // If Directory, default size 4096 (POSIX-like overhead)
        if (mode & S_IFDIR) {
            inode.size = 4096;
            this.usedBytes += 4096;
        }

        this.inodes.set(inode.id, inode);
        this.log(`createInode(${inode.id}, mode=${mode.toString(8)})`);
        return inode;
    }

    // --- Operations ---

    mkdir(path: string, mode: number = 0o755, uid: number = 0, gid: number = 0, cwd: string = '/'): Dentry {
        this.log(`mkdir(${path})`);
        return this.createDentry(path, S_IFDIR | mode, uid, gid, cwd);
    }

    createFile(path: string, mode: number = 0o644, uid: number = 0, gid: number = 0, cwd: string = '/'): Dentry {
        this.log(`createFile(${path})`);
        return this.createDentry(path, S_IFREG | mode, uid, gid, cwd);
    }

    symlink(target: string, linkPath: string, uid: number = 0, gid: number = 0, cwd: string = '/'): Dentry {
        this.log(`symlink(${target} -> ${linkPath})`);
        const dentry = this.createDentry(linkPath, S_IFLNK | 0o777, uid, gid, cwd);
        const inode = this.getInode(dentry.inodeId)!;
        inode.target = target;
        inode.size = target.length;
        this.usedBytes += target.length; // Symlink consumes bytes equal to target path len
        return dentry;
    }

    link(oldPath: string, newPath: string, cwd: string = '/'): Dentry {
        this.log(`link(${oldPath} -> ${newPath})`);
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
            parent = this.root;
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
            parent = this.root;
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

        parent.children.set(name, dentry);

        if (mode & S_IFDIR) {
            parentInode.links++;
        }

        parentInode.mtime = Date.now();
        parentInode.ctime = Date.now();

        return dentry;
    }

    writeFile(path: string, content: string, modeStr: 'w' | 'a' = 'w', cwd: string = '/'): Dentry {
        // this.log(`writeFile(${path}, mode=${modeStr})`);
        let dentry = this.resolve(path, cwd);
        let inode: Inode;

        if (!dentry) {
            dentry = this.createFile(path, 0o644, 1000, 1000, cwd);
            inode = this.getInode(dentry.inodeId)!;
        } else {
            inode = this.getInode(dentry.inodeId)!;
            if (inode.mode & S_IFDIR) throw new Error(`Cannot write to '${path}': Is a directory`);
        }

        const oldSize = inode.size;

        if (modeStr === 'w') {
            inode.content = content;
        } else {
            inode.content = (inode.content || '') + content;
        }
        inode.size = inode.content.length;
        this.usedBytes += (inode.size - oldSize);

        inode.mtime = Date.now();
        inode.ctime = Date.now();

        return dentry;
    }

    readFile(path: string, cwd: string = '/'): string {
        const dentry = this.resolve(path, cwd);
        if (!dentry) throw new Error(`${path}: No such file or directory`);
        const inode = this.getInode(dentry.inodeId);
        if (!inode) throw new Error('Corrupt filesystem');
        if (inode.mode & S_IFDIR) throw new Error(`${path}: Is a directory`);
        return inode.content as string;
    }

    deleteNode(path: string, cwd: string = '/'): void {
        this.log(`deleteNode(${path})`);
        const dentry = this.resolve(path, cwd, false);
        if (!dentry) throw new Error(`rm: cannot remove '${path}': No such file or directory`);
        if (!dentry.parent) throw new Error(`rm: cannot remove root`);

        const inode = this.getInode(dentry.inodeId)!;
        if ((inode.mode & S_IFDIR) && dentry.children.size > 0) {
            throw new Error(`rm: cannot remove '${path}': Directory not empty`);
        }

        dentry.parent.children.delete(dentry.name);
        inode.links--;

        const parentInode = this.getInode(dentry.parent.inodeId);
        if (parentInode) parentInode.mtime = Date.now();

        if (inode.links <= 0) {
            this.usedBytes -= inode.size;
            this.inodes.delete(inode.id);
        }
    }

    chmod(path: string, mode: number, cwd: string = '/'): void {
        this.log(`chmod(${path}, ${mode.toString(8)})`);
        const dentry = this.resolve(path, cwd);
        if (!dentry) throw new Error(`chmod: cannot access '${path}': No such file or directory`);
        const inode = this.getInode(dentry.inodeId)!;

        const typeMask = S_IFMT;
        const permMask = ~S_IFMT;
        inode.mode = (inode.mode & typeMask) | (mode & permMask);
        inode.ctime = Date.now();
    }

    chown(path: string, uid: number, gid: number, cwd: string = '/'): void {
        this.log(`chown(${path}, ${uid}, ${gid})`);
        const dentry = this.resolve(path, cwd);
        if (!dentry) throw new Error(`chown: cannot access '${path}': No such file or directory`);
        const inode = this.getInode(dentry.inodeId)!;
        if (uid !== -1) inode.uid = uid;
        if (gid !== -1) inode.gid = gid;
        inode.ctime = Date.now();
    }

    rename(oldPath: string, newPath: string, cwd: string = '/'): void {
        this.log(`rename(${oldPath} -> ${newPath})`);
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
            if (parts.length === 0 && isAbsolute) newParent = this.root;
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
        return !!(inode && (inode.mode & S_IFDIR));
    }

    private log(message: string) {
        // Logging hook
    }

    private initializeDefaultStructure() {
        const dirs = [
            '/bin', '/dev', '/etc', '/home', '/home/operator',
            '/lib', '/proc', '/root', '/tmp', '/usr', '/var',
            '/usr/bin', '/usr/lib', '/var/log'
        ];

        for (const dir of dirs) {
            if (!this.resolve(dir)) {
                this.mkdir(dir, 0o755, 0, 0);
            }
        }

        this.writeFile('/etc/passwd', 'root:x:0:0:root:/root:/bin/bash\noperator:x:1000:1000:operator:/home/operator:/bin/bash', 'w');
        this.chmod('/etc/passwd', 0o644);

        this.writeFile('/etc/config', 'SYSTEM CONFIGURATION\n--------------------\nMAX_THREADS=4\nTARGET_IP=UNRESOLVED\n\n[HINT]: NPCs will send encrypted coordinates. Use "vim" to write protocols and "compile" to decrypt.', 'w');

        this.writeFile('/bin/help', 'AVAILABLE COMMANDS:\nls - List files\ncd <dir> - Change directory\ncat <file> - Read file\nmail - Check mail\ncheck-comms - Force check mail\nvim <file> - Edit file\ncompile <file> - Process 24XX scripts\n', 'w');
        this.chmod('/bin/help', 0o755);

        this.writeFile('/home/operator/notes.txt', 'System initialized. Awaiting NPCs.', 'w');
        this.chown('/home/operator/notes.txt', 1000, 1000);
        this.chmod('/home/operator/notes.txt', 0o600);

        this.mkdir('/home/operator/mail', 0o700, 1000, 1000);
    }
}
