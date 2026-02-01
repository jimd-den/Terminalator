/**
 * DirectoryService - Domain Service
 * 
 * " The Architect "
 * 
 * Manages the structure of the filesystem tree.
 * Handles directory creation, listing, and removal.
 * 
 * Pillar: The Four-Fold Shield (Enterprise Logic)
 * Pillar: The Balanced Scale (SRP)
 */

import { Inode, S_IFDIR, S_IWUSR, S_IXUSR } from '../../entities/filesystem/FileSystemTypes';
import { InodeTable } from '../../entities/filesystem/InodeTable';
import { IFileSystemNode } from '../../entities/filesystem/IFileSystemNode';
import { DirectoryNode } from '../../entities/filesystem/DirectoryNode';
import { PermissionService } from './PermissionService';
import { PathResolver } from './PathResolver';

type Dentry = IFileSystemNode;

export class DirectoryService {
    constructor(
        private inodeTable: InodeTable,
        private permissions: PermissionService,
        private pathResolver: PathResolver,
        private root: Dentry,
        private updateUsage: (delta: number) => void
    ) { }

    /**
     * Creates a single directory.
     */
    public mkdir(parent: DirectoryNode, name: string, mode: number, uid: number, gid: number): Dentry {
        if (parent.getChild(name)) throw new Error('File exists');

        const fullMode = S_IFDIR | mode;
        const inode = this.inodeTable.allocate(fullMode, uid, gid);

        // Standard overhead for a directory (e.g. 4KB block)
        this.updateUsage(4096);

        const newNode = new DirectoryNode(name, inode.id, parent);
        parent.addChild(newNode);

        // Update Parent Metadata
        const parentInode = this.inodeTable.get(parent.inodeId);
        if (parentInode) {
            parentInode.links++; // ".." points back
            parentInode.mtime = Date.now();
            parentInode.ctime = Date.now();
        }

        return newNode;
    }

    /**
     * Recursive directory creation (mkdir -p).
     * 
     * Iterates through the path parts, resolving each step.
     * If a step is missing, it constructs it.
     */
    public mkdirp(path: string, mode: number, uid: number, gid: number, cwd: string = '/'): Dentry {
        // Normalization (naive for now, consistent with PathResolver expectation)
        const isAbsolute = path.startsWith('/');
        let targetPath = isAbsolute ? path : (cwd === '/' ? `/${path}` : `${cwd}/${path}`);
        targetPath = targetPath.replace(/\/\//g, '/'); // cleanup

        if (targetPath === '/') return this.root;

        const parts = targetPath.split('/').filter(p => p.length > 0);
        let currentPath = '';
        let lastDentry: Dentry = this.root;

        for (const part of parts) {
            currentPath += `/${part}`;

            // Try to find it
            const existing = this.pathResolver.resolve(this.root, currentPath, '/', true);

            if (existing) {
                lastDentry = existing;
                const inode = this.inodeTable.get(lastDentry.inodeId);
                if (inode && !(inode.mode & S_IFDIR)) {
                    throw new Error(`mkdirp: cannot create directory '${currentPath}': Not a directory`);
                }
            } else {
                // Must create it inside the *previous* dentry (which must be a dir)
                if (!lastDentry.isDirectory()) throw new Error('Not a directory');

                lastDentry = this.mkdir(lastDentry as DirectoryNode, part, mode, uid, gid);
            }
        }
        return lastDentry;
    }

    /**
     * Removes a node (unlink / rmdir).
     */
    public deleteNode(dentry: Dentry, actingUser?: { uid: number, gid: number, groups: number[] }): void {
        if (!dentry.parent) throw new Error('Cannot remove root');

        // Permission Check on PARENT (Write + Execute needed to modify directory list)
        if (actingUser) {
            const parentInode = this.inodeTable.get(dentry.parent.inodeId);
            if (parentInode) {
                if (!this.permissions.hasAccess(parentInode.id, actingUser, S_IWUSR) ||
                    !this.permissions.hasAccess(parentInode.id, actingUser, S_IXUSR)) {
                    throw new Error('Permission denied');
                }
            }
        }

        const inode = this.inodeTable.get(dentry.inodeId);
        if (!inode) throw new Error('Corrupt filesystem');

        // Directory not empty check
        if (inode.mode & S_IFDIR) {
            if (dentry.isDirectory()) {
                const dirNode = dentry as DirectoryNode;
                if (dirNode.children.size > 0) {
                    throw new Error('Directory not empty');
                }
            }
        }

        // Perform Removal
        const parent = dentry.parent as DirectoryNode;
        parent.removeChild(dentry.name);
        inode.links--;

        // Update Parent time
        const parentInode = this.inodeTable.get(parent.inodeId);
        if (parentInode) parentInode.mtime = Date.now();

        // Free Inode if no links remain implementation details
        if (inode.links <= 0) {
            this.updateUsage(-inode.size);
            this.inodeTable.free(inode.id);
        }
    }
}
