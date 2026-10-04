/**
 * FileSystemService - Domain Service Facade
 *
 * " The Conductor "
 *
 * Implementation of the Facade Pattern.
 * Orchestrates the specialized services (Permissions, Operations, Directory, Ownership)
 * to provide a unified, simple API to the rest of the application.
 * 
 * Satisfies:
 * - SRP (Delegates actual logic)
 * - OCP (New services can be injected/added)
 * - Facade Pattern (Hides complexity)
 *
 * Pillar: The Four-Fold Shield (Enterprise Logic)
 */

import { FileSystem, Inode, S_IFDIR, S_IFREG, S_IFLNK, S_IFMT, S_IFIFO, S_IRUSR, S_IWUSR, S_IXUSR, S_IRGRP, S_IWGRP, S_IXGRP, S_IROTH, S_IWOTH, S_IXOTH } from '../entities/FileSystem';
import { IFileSystemNode } from '../entities/filesystem/IFileSystemNode';
import { DirectoryNode } from '../entities/filesystem/DirectoryNode';
import { FileNode } from '../entities/filesystem/FileNode';

import { PathResolver } from './filesystem/PathResolver';
import { PermissionService } from './filesystem/PermissionService';
import { OwnershipService } from './filesystem/OwnershipService';
import { FileOperationService } from './filesystem/FileOperationService';
import { DirectoryService } from './filesystem/DirectoryService';

// Local Alias for backward compat
type Dentry = IFileSystemNode;

/** Process credentials: user, primary group and supplementary groups. */
export type Credentials = { uid: number, gid: number, groups: number[] };

export class FileSystemService {
    private pathResolver: PathResolver;
    private permissionService: PermissionService;
    private ownershipService: OwnershipService;
    private fileOps: FileOperationService;
    private dirService: DirectoryService;
    private writeListeners: ((path: string, content: string | Uint8Array, actingUser?: { uid: number, gid: number, groups: number[] }) => void)[] = [];
    /** Credentials of the process using this view (see `asUser`). Undefined = kernel/system access. */
    private credentials?: Credentials;

    constructor(private fs: FileSystem) {
        // Dependency Injection / Composition Root for FS Sub-system
        this.pathResolver = new PathResolver(fs.inodeTable);
        this.permissionService = new PermissionService(fs.inodeTable);
        this.ownershipService = new OwnershipService(fs.inodeTable);

        // Lambda for usage accounting to keep services pure-ish regarding Frame state
        const updateUsage = (delta: number) => { this.fs.usedBytes += delta; };

        this.fileOps = new FileOperationService(
            fs.inodeTable,
            this.permissionService,
            updateUsage
        );

        this.dirService = new DirectoryService(
            fs.inodeTable,
            this.permissionService,
            this.pathResolver,
            fs.root,
            updateUsage
        );
    }

    /**
     * Registers a listener for all write operations.
     */
    public onWrite(listener: (path: string, content: string | Uint8Array, actingUser?: { uid: number, gid: number, groups: number[] }) => void): void {
        this.writeListeners.push(listener);
    }

    get fileSystem(): FileSystem {
        return this.fs;
    }

    /**
     * A view of this file system bound to a process's credentials: every
     * operation that is not given explicit credentials is permission-checked
     * as `user`, and new files are owned by them. The view shares all state.
     */
    asUser(user: Credentials): FileSystemService {
        const view = Object.create(this) as FileSystemService;
        view.credentials = user;
        return view;
    }

    /** The credentials in effect (explicit argument, else the bound process). */
    private who(actingUser?: Credentials): Credentials | undefined {
        return actingUser ?? this.credentials;
    }

    /** Creating or removing an entry needs write+search permission on the directory. */
    private checkParentWritable(parent: Dentry, actingUser?: Credentials): void {
        const who = this.who(actingUser);
        if (!who) return;
        if (!this.permissionService.hasAccess(parent.inodeId, who, 2) || !this.permissionService.hasAccess(parent.inodeId, who, 1)) {
            throw new Error('Permission denied');
        }
    }

    // ==========================================
    // PATH RESOLUTION (Delegated to PathResolver)
    // ==========================================

    resolve(path: string, cwd: string = '/', followSymlinks: boolean = true, actingUser?: { uid: number, gid: number, groups: number[] }): Dentry | null {
        return this.pathResolver.resolve(this.fs.root, path, cwd, followSymlinks, this.who(actingUser));
    }

    resolveAbsolutePath(path: string, cwd: string): string {
        return PathResolver.resolveString(path, cwd);
    }

    getAbsolutePath(dentry: Dentry): string {
        return this.pathResolver.getAbsolutePath(dentry);
    }

    // ==========================================
    // PERMISSIONS (Delegated to PermissionService)
    // ==========================================

    hasAccess(inodeId: number, actingUser: { uid: number, gid: number, groups: number[] }, requiredBit: number): boolean {
        return this.permissionService.hasAccess(inodeId, actingUser, requiredBit);
    }

    // ==========================================
    // FILE OPERATIONS (Delegated to FileOps)
    // ==========================================

    readFile(path: string, cwd: string = '/', actingUser?: { uid: number, gid: number, groups: number[] }): string {
        const dentry = this.resolve(path, cwd, true, actingUser);
        if (!dentry) throw new Error(`${path}: No such file or directory`);
        return this.fileOps.readFile(dentry, this.who(actingUser));
    }

    readFileBuffer(path: string, cwd: string = '/', actingUser?: { uid: number, gid: number, groups: number[] }): Uint8Array {
        const dentry = this.resolve(path, cwd, true, actingUser);
        if (!dentry) throw new Error(`${path}: No such file or directory`);
        return this.fileOps.readFileBuffer(dentry, this.who(actingUser));
    }

    writeFile(path: string, content: string | Uint8Array, modeStr: 'w' | 'a' = 'w', uid?: number, gid?: number, cwd: string = '/', actingUser?: { uid: number, gid: number, groups: number[] }): Dentry {
        actingUser = this.who(actingUser);
        // We need to resolve first to see if it exists
        let dentry = this.resolve(path, cwd, true, actingUser);

        if (!dentry) {
            // Creation logic mixed with write logic - common pattern but maybe should separate?
            // Delegate creation to FileOps, then write.
            // But FileOps.createFile needs a Parent directory.
            // We need to resolve the Parent first.
            const absPath = this.resolveAbsolutePath(path, cwd);
            const parentPath = absPath.substring(0, absPath.lastIndexOf('/')) || '/';
            const name = absPath.substring(absPath.lastIndexOf('/') + 1);

            const parent = this.resolve(parentPath, cwd, true, actingUser);
            if (!parent || !parent.isDirectory()) throw new Error(`Cannot create '${path}': Parent directory not found`);

            // Permission check for creation is on the PARENT (Write+Exec)
            // This logic was implicit in the old code. We should verify strictly.
            // For now, let's call createFile which should handle it? 
            // Actually FileOps.createFile assumes checks done.
            // Let's rely on FileOps.createFile to throw if it can't link, but FileOps doesn't look at parent permissions currently?
            // Correction: The old code checked parent perms.
            // We should add parent perm check here or in FileOps.
            // Let's check here in Facade to keep services pure IO? 
            // No, Service "The Gatekeeper" should handle it.
            // We will trust FileOps.createFile (which calls createDentry).
            // Wait, I didn't add parent perm check to FileOps.createFile?
            // I should fix that. But let's proceed with functionality.

            this.checkParentWritable(parent, actingUser);
            dentry = this.fileOps.createFile(parent as DirectoryNode, name, 0o644, uid ?? actingUser?.uid ?? 1000, gid ?? actingUser?.gid ?? 1000);
        }

        this.fileOps.writeFile(dentry, content, modeStr, actingUser);
        
        // Notify listeners
        const absPath = this.resolveAbsolutePath(path, cwd);
        this.writeListeners.forEach(l => l(absPath, content, actingUser));

        return dentry;
    }

    createFile(path: string, mode: number = 0o644, uid?: number, gid?: number, cwd: string = '/'): Dentry {
        uid ??= this.credentials?.uid ?? 1000;
        gid ??= this.credentials?.gid ?? 1000;
        // Similar parent resolution logic
        const absPath = this.resolveAbsolutePath(path, cwd);
        const parentPath = absPath.substring(0, absPath.lastIndexOf('/')) || '/';
        const name = absPath.substring(absPath.lastIndexOf('/') + 1);

        const parent = this.resolve(parentPath, cwd, true); // Root/System usage usually defaults to full access
        if (!parent || !parent.isDirectory()) throw new Error(`Cannot create '${path}': Parent directory not found`);
        this.checkParentWritable(parent);

        return this.fileOps.createFile(parent as DirectoryNode, name, mode, uid, gid);
    }

    mkfifo(path: string, mode: number = 0o644, uid?: number, gid?: number, cwd: string = '/'): Dentry {
        uid ??= this.credentials?.uid ?? 1000;
        gid ??= this.credentials?.gid ?? 1000;
        const absPath = this.resolveAbsolutePath(path, cwd);
        const parentPath = absPath.substring(0, absPath.lastIndexOf('/')) || '/';
        const name = absPath.substring(absPath.lastIndexOf('/') + 1);

        const parent = this.resolve(parentPath, cwd, true);
        if (!parent || !parent.isDirectory()) throw new Error(`Cannot create '${path}': Parent directory not found`);

        return this.fileOps.mkfifo(parent as DirectoryNode, name, mode, uid, gid);
    }

    /** mknod(2): creates a device special file; `mode` includes the file type bits. */
    mknod(path: string, mode: number, rdev: number, uid: number = 0, gid: number = 0, cwd: string = '/'): Dentry {
        const absPath = this.resolveAbsolutePath(path, cwd);
        const parentPath = absPath.substring(0, absPath.lastIndexOf('/')) || '/';
        const name = absPath.substring(absPath.lastIndexOf('/') + 1);

        const parent = this.resolve(parentPath, cwd, true);
        if (!parent || !parent.isDirectory()) throw new Error(`Cannot create '${path}': Parent directory not found`);

        return this.fileOps.mknod(parent as DirectoryNode, name, mode, rdev, uid, gid);
    }

    // ==========================================
    // DIRECTORY OPERATIONS (Delegated to DirService)
    // ==========================================

    mkdir(path: string, mode: number = 0o755, uid?: number, gid?: number, cwd: string = '/'): Dentry {
        uid ??= this.credentials?.uid ?? 1000;
        gid ??= this.credentials?.gid ?? 1000;
        const absPath = this.resolveAbsolutePath(path, cwd);
        const parentPath = absPath.substring(0, absPath.lastIndexOf('/')) || '/';
        const name = absPath.substring(absPath.lastIndexOf('/') + 1);

        const parent = this.resolve(parentPath, cwd, true);
        if (!parent || !parent.isDirectory()) throw new Error(`Cannot create '${path}': Parent directory not found`);
        this.checkParentWritable(parent);

        return this.dirService.mkdir(parent as DirectoryNode, name, mode, uid, gid);
    }

    mkdirp(path: string, mode: number = 0o755, uid?: number, gid?: number, cwd: string = '/'): Dentry {
        uid ??= this.credentials?.uid ?? 1000;
        gid ??= this.credentials?.gid ?? 1000;
        return this.dirService.mkdirp(path, mode, uid, gid, cwd);
    }

    createDirectory(path: string, mode: number = 0o755, uid?: number, gid?: number, cwd: string = '/'): Dentry {
        uid ??= this.credentials?.uid ?? 1000;
        gid ??= this.credentials?.gid ?? 1000;
        return this.mkdirp(path, mode, uid, gid, cwd);
    }

    deleteNode(path: string, cwd: string = '/', actingUser?: { uid: number, gid: number, groups: number[] }): void {
        const dentry = this.resolve(path, cwd, false, actingUser);
        if (!dentry) throw new Error(`rm: cannot remove '${path}': No such file or directory`);
        this.dirService.deleteNode(dentry, this.who(actingUser));
    }

    // ==========================================
    // OWNERSHIP (Delegated to OwnershipService)
    // ==========================================

    chmod(path: string, mode: number, cwd: string = '/', actingUser?: { uid: number, gid: number, groups: number[] }): void {
        const dentry = this.resolve(path, cwd, true, actingUser);
        if (!dentry) throw new Error(`chmod: cannot access '${path}': No such file or directory`);
        this.ownershipService.chmod(dentry, mode, this.who(actingUser));
    }

    chown(path: string, uid: number, gid: number, cwd: string = '/', actingUser?: { uid: number, gid: number, groups: number[] }): void {
        const dentry = this.resolve(path, cwd, true, actingUser);
        if (!dentry) throw new Error(`chown: cannot access '${path}': No such file or directory`);
        this.ownershipService.chown(dentry, uid, gid, this.who(actingUser));
    }

    // ==========================================
    // MISC / LEGACY (To be refactored or kept in facade)
    // ==========================================

    getInode(id: number): Inode | undefined {
        return this.fs.inodeTable.get(id);
    }

    isDirectory(dentry: Dentry): boolean {
        // Pure state check, fine to keep here or move to Dentry extension
        const inode = this.getInode(dentry.inodeId);
        return inode ? (inode.mode & S_IFMT) === S_IFDIR : false;
    }

    getUsage(): number {
        return this.fs.usedBytes;
    }

    // Stat / Type checks
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
            // Compare the whole type field: S_IFLNK shares bits with S_IFREG and S_IFDIR.
            isDirectory: (inode.mode & S_IFMT) === S_IFDIR,
            isFile: (inode.mode & S_IFMT) === S_IFREG,
            isSymlink: (inode.mode & S_IFMT) === S_IFLNK
        };
    }

    // MISSING IN NEW SERVICES: symlink, link, readlink, rename
    // For now, implementing inline to maintain interface, or should create LinkService?
    // Let's implement inline using similar logic for now to obey "Don't break build", 
    // but ideally extract to LinkService.

    symlink(target: string, linkPath: string, uid: number = 1000, gid: number = 1000, cwd: string = '/'): Dentry {
        // Inline Implementation for now
        // 1. Resolve parent of linkPath
        const absPath = this.resolveAbsolutePath(linkPath, cwd);
        const parentPath = absPath.substring(0, absPath.lastIndexOf('/')) || '/';
        const name = absPath.substring(absPath.lastIndexOf('/') + 1);

        const parent = this.resolve(parentPath, cwd, true);
        if (!parent || !parent.isDirectory()) throw new Error(`Cannot create symlink '${linkPath}': Parent not found`);

        const parentDir = parent as DirectoryNode;
        if (parentDir.getChild(name)) throw new Error('File exists');
        this.checkParentWritable(parentDir);

        const inode = this.fs.inodeTable.allocate(S_IFLNK | 0o777, this.credentials?.uid ?? uid, this.credentials?.gid ?? gid);
        const newNode = new FileNode(name, inode.id, parentDir);
        parentDir.addChild(newNode);

        inode.target = target;
        inode.size = target.length;
        this.fs.usedBytes += target.length;

        return newNode;
    }

    readlink(path: string, cwd: string = '/'): string {
        const dentry = this.resolve(path, cwd, false);
        if (!dentry) throw new Error(`readlink: cannot access '${path}': No such file or directory`);
        const inode = this.getInode(dentry.inodeId)!;
        if ((inode.mode & S_IFMT) !== S_IFLNK) throw new Error(`readlink: '${path}': Invalid argument`);
        return inode.target || '';
    }

    link(oldPath: string, newPath: string, cwd: string = '/'): Dentry {
        // Hard link logic
        const oldDentry = this.resolve(oldPath, cwd);
        if (!oldDentry) throw new Error(`link: cannot access '${oldPath}': No such file or directory`);
        const inode = this.getInode(oldDentry.inodeId);
        if (!inode) throw new Error('Corrupt filesystem');
        if ((inode.mode & S_IFMT) === S_IFDIR) throw new Error(`link: '${oldPath}': Hard link to directory not allowed`);

        const absPath = this.resolveAbsolutePath(newPath, cwd);
        const parentPath = absPath.substring(0, absPath.lastIndexOf('/')) || '/';
        const name = absPath.substring(absPath.lastIndexOf('/') + 1);

        const parent = this.resolve(parentPath, cwd, true);
        if (!parent || !parent.isDirectory()) throw new Error(`link: cannot create link '${newPath}': Parent not found`);

        const parentDir = parent as DirectoryNode;
        if (parentDir.getChild(name)) throw new Error(`link: failed to create link '${newPath}': File exists`);
        this.checkParentWritable(parentDir);

        const dentry = new FileNode(name, inode.id, parentDir);
        parentDir.addChild(dentry);
        inode.links++;
        inode.ctime = Date.now();
        return dentry;
    }

    rename(oldPath: string, newPath: string, cwd: string = '/'): void {
        // Complex logic, keep here for now or move to EntryMoverService
        const oldDentry = this.resolve(oldPath, cwd, false);
        if (!oldDentry) throw new Error(`rename: cannot access '${oldPath}': No such file or directory`);
        if (!oldDentry.parent) throw new Error(`rename: cannot move root`);

        const existing = this.resolve(newPath, cwd, false);
        if (existing) {
            this.deleteNode(newPath, cwd); // Delete target if exists
        }

        const absPath = this.resolveAbsolutePath(newPath, cwd);
        const parentPath = absPath.substring(0, absPath.lastIndexOf('/')) || '/';
        const newName = absPath.substring(absPath.lastIndexOf('/') + 1);

        const newParent = this.resolve(parentPath, cwd, true);
        if (!newParent || !newParent.isDirectory()) throw new Error(`rename: cannot move to '${newPath}': Parent not found`);

        const targetParentDir = newParent as DirectoryNode;
        const oldParent = oldDentry.parent as DirectoryNode;
        this.checkParentWritable(oldParent);
        this.checkParentWritable(targetParentDir);

        oldParent.removeChild(oldDentry.name);
        oldDentry.parent = targetParentDir;
        oldDentry.name = newName;
        targetParentDir.addChild(oldDentry);

        const inode = this.getInode(oldDentry.inodeId);
        if (inode) inode.ctime = Date.now();
    }
}
