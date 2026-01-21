import { InodeTable, Inode } from '../entities/InodeTable';

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

    constructor() {
        this.inodeTable = new InodeTable();

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

    // Deprecated helpers for compatibility during refactor, calling these will now fail at runtime 
    // if compiled against old definitions, but we are fixing consumers.
    // We intentionally do NOT include them to force compile errors where usage exists.
}
