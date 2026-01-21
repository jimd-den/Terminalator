import { InodeTable } from './filesystem/InodeTable';
import { Inode, S_IFDIR, S_IFREG, S_IFLNK } from './filesystem/FileSystemTypes';
import { PathResolver } from '../services/filesystem/PathResolver';

// Constants (Keep these here or move to a constants file, keeping for compatibility)
export const S_IFMT = 0o170000;
export const S_IFSOCK = 0o140000;
export const S_IFLNK = 0o120000;
export const S_IFREG = 0o100000;
export const S_IFBLK = 0o060000;
export const S_IFDIR = 0o040000;
export const S_IFCHR = 0o020000;
export const S_IFIFO = 0o010000;
export const S_ISUID = 0o4000;
export const S_ISGID = 0o2000;
export const S_ISVTX = 0o1000;

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

export enum FileType {
    Directory = S_IFDIR,
    File = S_IFREG,
    Symlink = S_IFLNK,
    CharDevice = S_IFCHR,
    BlockDevice = S_IFBLK,
    FIFO = S_IFIFO,
    Socket = S_IFSOCK
}

export { InodeTable, Inode };

export interface Dentry {
    name: string;
    inodeId: number;
    parent: Dentry | null;
    children: Map<string, Dentry>;
}

export class FileSystem {
    public inodeTable: InodeTable;
    public usedBytes: number = 0;
    public root: Dentry;
    private pathResolver: PathResolver;

    constructor() {
        this.inodeTable = new InodeTable();
        this.pathResolver = new PathResolver(this.inodeTable);

        // Create Root Inode (ID 1)
        // Manually create root inode to ensure ID 1
        const rootInode = this.inodeTable.allocate(S_IFDIR | 0o755, 0, 0);
        rootInode.size = 4096;
        rootInode.links = 2; // . and ..

        this.usedBytes += 4096;

        // Create Root Dentry
        this.root = {
            name: '/',
            inodeId: rootInode.id,
            parent: null,
            children: new Map(),
        };
        this.attachDentryHelpers(this.root);

        // Initialize Standard Directories (Mocking a real OS)
        this.mkdir('/bin', 0o755);
        this.mkdir('/usr', 0o755);
        this.mkdir('/usr/bin', 0o755);
        this.mkdir('/home', 0o755);
        this.mkdir('/home/operator', 0o700);
        // Add 'mail' to operator home for ls tests
        this.writeFile('/home/operator/mail', 'You have mail', 'w');
    }

    public attachDentryHelpers(dentry: Dentry) {
        // Prevent cyclic reference issues in JSON stringify if needed
        Object.defineProperty(dentry, 'toJSON', {
            value: () => ({
                name: dentry.name,
                inodeId: dentry.inodeId,
                children: Array.from(dentry.children.keys())
            })
        });
    }

    /**
     * Resolves the parent directory and the base name of a path.
     * Validates that the parent is a directory.
     *
     * @param path The path to resolve.
     * @param cwd The current working directory.
     * @returns Object containing parent Dentry and base name.
     */
    private resolveParentAndName(path: string, cwd: string): { parent: Dentry, name: string } {
        // Strip trailing slash if present (unless root)
        let normalizedPath = path;
        if (normalizedPath.length > 1 && normalizedPath.endsWith('/')) {
            normalizedPath = normalizedPath.slice(0, -1);
        }

        let parentNode: Dentry | null = null;
        let baseName = '';

        const lastSlash = normalizedPath.lastIndexOf('/');
        if (lastSlash === -1) {
            // Relative to CWD
            parentNode = this.resolveNode('.', cwd);
            baseName = normalizedPath;
        } else if (lastSlash === 0) {
            // Root child: /tmp
            parentNode = this.root;
            baseName = normalizedPath.substring(1);
        } else {
            // /a/b/c
            const parentDir = normalizedPath.substring(0, lastSlash);
            parentNode = this.resolveNode(parentDir, cwd);
            baseName = normalizedPath.substring(lastSlash + 1);
        }

        if (!parentNode) {
            throw new Error('No such file or directory');
        }

        // Validate Parent is a Directory
        const parentInode = this.inodeTable.get(parentNode.inodeId);
        if (!parentInode) throw new Error('Inode missing');
        if (!(parentInode.mode & S_IFDIR)) {
            throw new Error('Not a directory');
        }

        return { parent: parentNode, name: baseName };
    }


    // Facade Methods for POSIX Suite Compliance

    public resolveNode(path: string, cwd: string = '/'): Dentry | null {
        return this.pathResolver.resolve(this.root, path, cwd);
    }

    public mkdir(path: string, mode: number, cwd: string = '/'): void {
        if (this.resolveNode(path, cwd)) {
            throw new Error('File exists');
        }

        const { parent, name } = this.resolveParentAndName(path, cwd);

        if (!name) return; // Root?

        if (parent.children.has(name)) {
            throw new Error('File exists');
        }

        // Allocate Inode
        const inode = this.inodeTable.allocate(S_IFDIR | mode, 0, 0);

        // Create Dentry
        const dentry: Dentry = {
            name: name,
            inodeId: inode.id,
            parent: parent,
            children: new Map()
        };
        this.attachDentryHelpers(dentry);

        parent.children.set(name, dentry);
    }

    public writeFile(path: string, content: string | Uint8Array, options: any = 'w', cwd: string = '/'): void {
        const { parent, name } = this.resolveParentAndName(path, cwd);

        const existingDentry = parent.children.get(name);

        if (existingDentry) {
            // Update existing
            const inode = this.inodeTable.get(existingDentry.inodeId);
            if (!inode) throw new Error('Inode missing');
            if (inode.mode & S_IFDIR) throw new Error('Is a directory');

            inode.content = content;
            inode.size = content.length;
            inode.mtime = Date.now();
        } else {
            // Create new
            const inode = this.inodeTable.allocate(S_IFREG | 0o644, 0, 0); // Default permission
            inode.content = content;
            inode.size = content.length;

            const dentry: Dentry = {
                name: name,
                inodeId: inode.id,
                parent: parent,
                children: new Map()
            };
            this.attachDentryHelpers(dentry);
            parent.children.set(name, dentry);
        }
    }

    public readFile(path: string, cwd: string = '/'): string | Uint8Array {
        const dentry = this.resolveNode(path, cwd);
        if (!dentry) throw new Error('No such file or directory');

        const inode = this.inodeTable.get(dentry.inodeId);
        if (!inode) throw new Error('Inode missing');
        if (inode.mode & S_IFDIR) throw new Error('Is a directory');

        return inode.content as string | Uint8Array;
    }

    public rmdir(path: string, cwd: string = '/'): void {
        const dentry = this.resolveNode(path, cwd);
        if (!dentry) throw new Error('No such file or directory');

        const inode = this.inodeTable.get(dentry.inodeId);
        if (!inode) throw new Error('Inode missing');
        if (!(inode.mode & S_IFDIR)) throw new Error('Not a directory');

        // Check if empty (excluding . and .. which are virtual/implied)
        if (dentry.children.size > 0) {
             throw new Error('Directory not empty');
        }

        if (dentry.parent) {
            dentry.parent.children.delete(dentry.name);
            this.inodeTable.free(dentry.inodeId);
        }
    }

    public unlink(path: string, cwd: string = '/'): void {
        const dentry = this.resolveNode(path, cwd);
        if (!dentry) throw new Error('No such file or directory');

        const inode = this.inodeTable.get(dentry.inodeId);
        if (!inode) throw new Error('Inode missing');
        if (inode.mode & S_IFDIR) throw new Error('Is a directory'); // use rmdir for dirs

        if (dentry.parent) {
            dentry.parent.children.delete(dentry.name);
            // In strict POSIX, unlink decrements link count. Free if 0.
            // Simplified here:
            this.inodeTable.free(dentry.inodeId);
        }
    }
}
