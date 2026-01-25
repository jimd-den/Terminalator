import { InodeTable } from './filesystem/InodeTable';
import { Inode } from './filesystem/FileSystemTypes';
import { DirectoryNode } from './filesystem/DirectoryNode';
import { FileNode } from './filesystem/FileNode';
import { IFileSystemNode } from './filesystem/IFileSystemNode';

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

// Compatibility alias to ease refactor pain in other files
export type Dentry = IFileSystemNode;

export class FileSystem {
    public inodeTable: InodeTable;
    public usedBytes: number = 0;
    public root: DirectoryNode;

    constructor() {
        this.inodeTable = new InodeTable();

        // Create Root Inode (ID 1)
        // Manually create root inode to ensure ID 1
        const rootInode = this.inodeTable.allocate(S_IFDIR | 0o755, 0, 0);
        rootInode.size = 4096;
        rootInode.links = 2; // . and ..

        this.usedBytes += 4096;

        // Create Root DirectoryNode
        this.root = new DirectoryNode('/', rootInode.id);

        // Initialize default directories
        this.mkdir('/home');
        this.mkdir('/home/operator');
        this.mkdir('/bin');
        this.mkdir('/usr/bin');
        this.mkdir('/tmp');
        this.mkdir('/var/mail');
    }

    private mkdir(path: string) {
        // Simple bootstrap mkdir (assumes strict hierarchy creation or handled by logic)
        // Note: This logic duplicates Service/mkdirp but simplified for bootstrap.
        const parts = path.split('/').filter(p => p.length > 0);
        let current: DirectoryNode = this.root;

        for (const part of parts) {
            let child = current.getChild(part);
            if (!child) {
                const inode = this.inodeTable.allocate(S_IFDIR | 0o755, 0, 0);
                inode.size = 4096;
                inode.links = 2; // . and .. points to parent
                child = new DirectoryNode(part, inode.id, current);
                current.addChild(child);

                // Update parent links?
                // Parent inode links++ (for '..')
                const parentInode = this.inodeTable.get(current.inodeId);
                if (parentInode) parentInode.links++;
            }
            if (child.isDirectory()) {
                current = child as DirectoryNode;
            } else {
                // Should not happen during bootstrap unless name collision
                throw new Error(`Bootstrap error: ${part} is not a directory`);
            }
        }
    }

    // Deprecated helpers removed. 
    // Consumers must start using Node methods or Service.
    public attachDentryHelpers(dentry: Dentry) {
        // No-op or throw?
        // This was used to monkey-patch JSON. Nodes should handle their own serialization if needed.
    }
}
