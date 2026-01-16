/**
 * FileSystem Entity - Domain Layer
 * 
 * A simulated POSIX-compliant file system.
 * Supports a tree structure of files and directories.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture) - Entities
 * Pillar: The Balanced Scale (SOLID / KISS) - Simple Tree Structure
 *
 * Intent:
 * Provides the persistent state of the virtual world.
 * Allows commands to manipulate files and directories.
 */

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
    content: any;    // string for files, Map<string, number> for dirs (optional optimization), null for devs
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
            content: null // For directories, content is technically the list of entries, but we manage via Dentries
        };
        this.inodes.set(rootInode.id, rootInode);

        // Create Root Dentry
        this.root = {
            name: '/',
            type: 'directory',
            children: {
                'bin': {
                    name: 'bin', type: 'directory', owner: 'root', permissions: 'rwxr-xr-x', updatedAt: new Date().toISOString(), children: {
                        'help': { name: 'help', type: 'file', content: 'AVAILABLE COMMANDS:\nls - List files\ncd <dir> - Change directory\ncat <file> - Read file\nmail - Check mail\nvim <file> - Edit file\ncompile <file> - Process 24XX scripts\n', owner: 'root', permissions: 'r-xr-xr-x', updatedAt: new Date().toISOString() },
                    }
                },
                'home': {
                    name: 'home', type: 'directory', owner: 'root', permissions: 'rwxr-xr-x', updatedAt: new Date().toISOString(), children: {
                        'operator': {
                            name: 'operator', type: 'directory', owner: 'operator', permissions: 'rwx------', updatedAt: new Date().toISOString(), children: {
                                'mail': { name: 'mail', type: 'directory', owner: 'operator', permissions: 'rwx------', updatedAt: new Date().toISOString(), children: {} },
                                'notes.txt': { name: 'notes.txt', type: 'file', content: 'System initialized. Awaiting NPCs.', owner: 'operator', permissions: 'rw-------', updatedAt: new Date().toISOString() },
                            }
                        },
                    }
                },
                'etc': {
                    name: 'etc', type: 'directory', owner: 'root', permissions: 'rwxr-xr-x', updatedAt: new Date().toISOString(), children: {
                        'config': { name: 'config', type: 'file', content: 'SYSTEM CONFIGURATION\n--------------------\nMAX_THREADS=4\nTARGET_IP=UNRESOLVED\n\n[HINT]: NPCs will send encrypted coordinates. Use "vim" to write protocols and "compile" to decrypt.', owner: 'root', permissions: 'r--r--r--', updatedAt: new Date().toISOString() },
                    }
                },
            },
            owner: 'root',
            permissions: 'rwxr-xr-x',
            updatedAt: new Date().toISOString(),
        };
    }

    /**
     * Traverses the file system to find a node by path.
     *
     * @param path - The absolute or relative path to the node.
     * @returns The FSNode if found, otherwise null.
     */
    getNode(path: string): FSNode | null {
        if (path === '/') return this.root;
        const parts = path.split('/').filter(p => p.length > 0);
        let current = this.root;

        for (const part of parts) {
            if (part === '..') {
                if (current.parent) {
                    current = current.parent;
                }
            } else {
                let next = current.children.get(part);
                if (!next) {
                    return null;
                }
                current = next;
            }
        }
        return current;
    }

    // Alias for compatibility/readability
    resolveNode(path: string, cwd: string = '/'): Dentry | null {
        return this.resolve(path, cwd);
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

    // --- Operations ---

    mkdir(path: string, mode: number = 0o755, uid: number = 0, gid: number = 0, cwd: string = '/'): Dentry {
        const parentPath = path.substring(0, path.lastIndexOf('/')) || (path.startsWith('/') ? '/' : cwd);
        const name = path.substring(path.lastIndexOf('/') + 1);

        // Handle "mkdir foo" where foo is in cwd
        // If path is "foo/bar" parent is "foo"
        // Let's use robust split logic
        const parts = path.split('/');
        const newName = parts.pop();
        if (!newName) throw new Error('Invalid path');

        const parentStr = parts.length === 0 ? cwd : (path.startsWith('/') ? '/' + parts.join('/') : parts.join('/'));
        // Fix for "/foo" -> parent "/", name "foo"
        // Fix for "foo" -> parent cwd, name "foo"

        // Actually, just resolve parent of full path
        // Simplest: use createDentry logic
        return this.createDentry(path, S_IFDIR | mode, uid, gid, cwd);
    }

    createFile(path: string, mode: number = 0o644, uid: number = 0, gid: number = 0, cwd: string = '/'): Dentry {
        return this.createDentry(path, S_IFREG | mode, uid, gid, cwd);
    }

    private createDentry(path: string, mode: number, uid: number, gid: number, cwd: string): Dentry {
        // Resolve Parent
        // Logic: "dirname" of path
        let parent: Dentry | null;
        let name: string;

        if (path.includes('/')) {
            const lastSlash = path.lastIndexOf('/');
            const dirPart = path.substring(0, lastSlash);
            name = path.substring(lastSlash + 1);
            // If path was "/foo", dirPart is "", meaning root? No, "/" is root.
            // If path is "/bin/ls", dirPart is "/bin".
            // If path is "usr/bin", dirPart is "usr".

            if (dirPart === '') {
                // Path was "/name"
                parent = this.root;
            } else {
                parent = this.resolve(dirPart, cwd);
            }
        } else {
            name = path;
            parent = this.resolve(cwd);
        }

        if (!parent) throw new Error(`Cannot create '${path}': Parent directory not found`);
        const parentInode = this.getInode(parent.inodeId);
        if (!parentInode || !(parentInode.mode & S_IFDIR)) throw new Error(`Cannot create '${path}': Parent is not a directory`);

        if (parent.children.has(name)) throw new Error(`Cannot create '${path}': File exists`);

        // Create Inode
        const inode = this.createInode(mode, uid, gid);

        // Create Dentry
        const dentry: Dentry = {
            name: name,
            inodeId: inode.id,
            parent: parent,
            children: new Map()
        };

        // Link
        parent.children.set(name, dentry);

        // Update parent timestamps/links needed?
        // In true FS, directories are just files. Here we update ref.
        // Directory hard links = 2 + num_subdirs. 
        // But for now, simple.

        return dentry;
    }

    writeFile(path: string, content: string, modeStr: 'w' | 'a' = 'w', cwd: string = '/'): Dentry {
        let dentry = this.resolve(path, cwd);
        let inode: Inode;

        if (!dentry) {
            // Create
            dentry = this.createFile(path, 0o644, 1000, 1000, cwd); // Default user 1000
            inode = this.getInode(dentry.inodeId)!;
        } else {
            inode = this.getInode(dentry.inodeId)!;
            if (inode.mode & S_IFDIR) throw new Error(`Cannot write to '${path}': Is a directory`);
        }

        if (modeStr === 'w') {
            inode.content = content;
        } else {
            inode.content = (inode.content || '') + content;
        }
        inode.size = inode.content.length;
        inode.mtime = Date.now();
        inode.ctime = Date.now();

        return dentry;
    }

    readFile(path: string, cwd: string = '/'): string {
        const dentry = this.resolve(path, cwd);
        if (!dentry) throw new Error(`cat: ${path}: No such file or directory`);
        const inode = this.getInode(dentry.inodeId);
        if (!inode) throw new Error('Corrupt filesystem');
        if (inode.mode & S_IFDIR) throw new Error(`cat: ${path}: Is a directory`);
        return inode.content as string;
    }

    deleteNode(path: string, cwd: string = '/'): void {
        const dentry = this.resolve(path, cwd);
        if (!dentry) throw new Error(`rm: cannot remove '${path}': No such file or directory`);
        if (!dentry.parent) throw new Error(`rm: cannot remove root`);

        // Check if directory and not empty
        const inode = this.getInode(dentry.inodeId)!;
        if ((inode.mode & S_IFDIR) && dentry.children.size > 0) {
            throw new Error(`rm: cannot remove '${path}': Directory not empty`);
        }

        dentry.parent.children.delete(dentry.name);
        inode.links--;
        // If links == 0, free inode (remove from map)
        if (inode.links <= 0) {
            this.inodes.delete(inode.id);
        }
    }

    chmod(path: string, mode: number, cwd: string = '/'): void {
        const dentry = this.resolve(path, cwd);
        if (!dentry) throw new Error(`chmod: cannot access '${path}': No such file or directory`);
        const inode = this.getInode(dentry.inodeId)!;

        // Keep file type bits, replace permission bits
        const typeMask = S_IFMT;
        const permMask = ~S_IFMT;
        inode.mode = (inode.mode & typeMask) | (mode & permMask);
        inode.ctime = Date.now();
    }

    chown(path: string, uid: number, gid: number, cwd: string = '/'): void {
        const dentry = this.resolve(path, cwd);
        if (!dentry) throw new Error(`chown: cannot access '${path}': No such file or directory`);
        const inode = this.getInode(dentry.inodeId)!;
        inode.uid = uid;
        inode.gid = gid;
        inode.ctime = Date.now();
    }

    rename(oldPath: string, newPath: string, cwd: string = '/'): void {
        const oldDentry = this.resolve(oldPath, cwd);
        if (!oldDentry) throw new Error(`rename: cannot access '${oldPath}': No such file or directory`);
        if (!oldDentry.parent) throw new Error(`rename: cannot move root`);

        // Check if newPath exists
        const existing = this.resolve(newPath, cwd);
        if (existing) {
            // If existing is dir and old is file? Error? Or overwrite? 
            // POSIX: if existing is dir and empty, overwrite? 
            // Typically rename overwrites if types match.
            // For now: throw if exists, unless caller handles it.
            // Actually, simplest is:
            this.deleteNode(newPath, cwd);
        }

        // Parent of newPath
        // Resolve parent of newPath
        let newParent: Dentry | null = null;
        let newName: string;

        if (newPath.includes('/')) {
            const lastSlash = newPath.lastIndexOf('/');
            const dirPart = newPath.substring(0, lastSlash);
            newName = newPath.substring(lastSlash + 1);
            newParent = dirPart === '' ? this.root : this.resolve(dirPart, cwd);
        } else {
            newName = newPath;
            newParent = this.resolve(cwd);
        }

        if (!newParent) throw new Error(`rename: cannot move to '${newPath}': Parent not found`);
        const parentInode = this.getInode(newParent.inodeId);
        if (!parentInode || !(parentInode.mode & S_IFDIR)) throw new Error(`rename: '${newPath}': Parent not a directory`);

        // Unlink from old
        oldDentry.parent.children.delete(oldDentry.name);

        // Link to new
        oldDentry.parent = newParent;
        oldDentry.name = newName;
        newParent.children.set(newName, oldDentry);

        // Update ctime of inode?
        const inode = this.getInode(oldDentry.inodeId);
        if (inode) inode.ctime = Date.now();
    }

    // --- Helpers ---

    isDirectory(dentry: Dentry): boolean {
        const inode = this.getInode(dentry.inodeId);
        return !!(inode && (inode.mode & S_IFDIR));
    }

    // --- Initialization ---

    private initializeDefaultStructure() {
        // Root already serves as /
        // Create standard dirs
        const dirs = [
            '/bin', '/dev', '/etc', '/home', '/home/operator',
            '/lib', '/proc', '/root', '/tmp', '/usr', '/var',
            '/usr/bin', '/usr/lib', '/var/log'
        ];

        for (const dir of dirs) {
            // Check if exists first to avoid error
            if (!this.resolve(dir)) {
                this.mkdir(dir, 0o755, 0, 0);
            }
        }

        // Create initial files
        const now = Date.now();
        // /etc/passwd
        this.writeFile('/etc/passwd', 'root:x:0:0:root:/root:/bin/bash\noperator:x:1000:1000:operator:/home/operator:/bin/bash', 'w');
        this.chmod('/etc/passwd', 0o644);

        // /home/operator/notes.txt
        this.writeFile('/home/operator/notes.txt', 'System initialized. Awaiting NPCs.', 'w');
        this.chown('/home/operator/notes.txt', 1000, 1000);
        this.chmod('/home/operator/notes.txt', 0o600);
    }
}
