/**
 * WasiFileSystemBridge
 * 
 * Bridges WASI system calls to the Application's Virtual FileSystem.
 * Handles file descriptor management, cursors, and I/O mapping.
 * 
 * Pillar: The Bridge (Interface Adapters)
 */

import { FileSystem } from '../../domain/entities/FileSystem';
import { Inode } from '../../domain/entities/FileSystem';
import { FileSystemService } from '../../domain/services/FileSystemService';

// WASI Constants
export const WASI_ESUCCESS = 0;
export const WASI_EBADF = 8;
export const WASI_EINVAL = 28;
export const WASI_ENOENT = 44;
export const WASI_ENOTDIR = 54;
export const WASI_EEXIST = 20;

export const WASI_O_CREAT = 1;
export const WASI_O_DIRECTORY = 2;
export const WASI_O_EXCL = 4;
export const WASI_O_TRUNC = 8;

export interface FileDescriptor {
    id: number;
    inodeId: number;
    position: number;
    flags: number;
    path: string; // for debugging
}

export class WasiFileSystemBridge {
    private fileDescriptors: Map<number, FileDescriptor> = new Map();
    private nextFd = 3; // 0, 1, 2 reserved for stdin, stdout, stderr
    private args: string[] = [];
    private service: FileSystemService;

    constructor(private fs: FileSystem) {
        this.service = new FileSystemService(fs);
        // Initialize stdio placeholders
        this.fileDescriptors.set(0, { id: 0, inodeId: -1, position: 0, flags: 0, path: '<stdin>' });
        this.fileDescriptors.set(1, { id: 1, inodeId: -1, position: 0, flags: 0, path: '<stdout>' });
        this.fileDescriptors.set(2, { id: 2, inodeId: -1, position: 0, flags: 0, path: '<stderr>' });
    }

    setArgs(args: string[]) {
        this.args = args;
    }

    getArgs(): string[] {
        return this.args;
    }

    /**
     * wasi: path_open
     * Maps a path to a file descriptor.
     */
    path_open(
        dirfd: number,
        dirflags: number,
        path: string,
        oflags: number,
        fs_rights_base: bigint,
        fs_rights_inheriting: bigint,
        fd_flags: number
    ): { code: number, fd: number } {
        // Resolve path relative to CWD (ignoring dirfd for simplicity in this MVP, assuming absolute or CWD relative)
        // In full WASI, dirfd matters. Here we'll treat dirfd=3 (cwd) semantics or just use FS resolution.

        // For simplicity, we assume generic resolution from root if absolute, or relative to a default CWD.
        // The CompilerService should probably set CWD context.
        // We'll trust the FS to resolve the path string.

        let dentry = this.service.resolve(path);

        if ((oflags & WASI_O_CREAT)) {
            if (!dentry) {
                // Create file
                try {
                    // Default to creating as file
                    dentry = this.service.createFile(path);
                } catch (e) {
                    return { code: WASI_ENOENT, fd: -1 };
                }
            } else if ((oflags & WASI_O_EXCL)) {
                return { code: WASI_EEXIST, fd: -1 };
            }
        }

        if (!dentry) {
            return { code: WASI_ENOENT, fd: -1 };
        }

        if ((oflags & WASI_O_TRUNC)) {
            const inode = this.service.getInode(dentry.inodeId);
            if (inode) {
                inode.content = new Uint8Array(0);
                inode.size = 0;
            }
        }

        const fd = this.nextFd++;
        this.fileDescriptors.set(fd, {
            id: fd,
            inodeId: dentry.inodeId,
            position: 0,
            flags: oflags,
            path: path
        });

        return { code: WASI_ESUCCESS, fd };
    }

    /**
     * wasi: fd_write
     */
    fd_write(fd: number, iovs: Uint8Array[]): { code: number, nwritten: number } {
        if (fd === 1 || fd === 2) {
            // Stdout/Stderr capture (handled by caller typically, or we log)
            let total = 0;
            const decoder = new TextDecoder();
            for (const iov of iovs) {
                const str = decoder.decode(iov);
                process.stdout.write(str); // Forward to real stdout for debug
                total += iov.byteLength;
            }
            return { code: WASI_ESUCCESS, nwritten: total };
        }

        const desc = this.fileDescriptors.get(fd);
        if (!desc || desc.inodeId === -1) return { code: WASI_EBADF, nwritten: 0 };

        const inode = this.service.getInode(desc.inodeId);
        if (!inode) return { code: WASI_EBADF, nwritten: 0 };

        // Append logic or overwrite based on position
        // We need to convert inode content to Uint8Array if it isn't
        let content = inode.content instanceof Uint8Array
            ? inode.content
            : new TextEncoder().encode(inode.content as string);

        // Calculate total size to write
        let writeLen = 0;
        for (const iov of iovs) writeLen += iov.byteLength;

        // Resize buffer if needed
        const requiredSize = desc.position + writeLen;
        if (content.length < requiredSize) {
            const newContent = new Uint8Array(requiredSize);
            newContent.set(content);
            content = newContent;
        }

        // Write data
        let cursor = desc.position;
        for (const iov of iovs) {
            content.set(iov, cursor);
            cursor += iov.byteLength;
        }

        inode.content = content;
        inode.size = content.length;
        desc.position = cursor;

        return { code: WASI_ESUCCESS, nwritten: writeLen };
    }

    /**
     * wasi: fd_read
     */
    fd_read(fd: number, length: number): { code: number, data: Uint8Array | null } {
        const desc = this.fileDescriptors.get(fd);
        if (!desc || desc.inodeId === -1) return { code: WASI_EBADF, data: null };

        const inode = this.service.getInode(desc.inodeId);
        if (!inode) return { code: WASI_EBADF, data: null };

        let content = inode.content instanceof Uint8Array
            ? inode.content
            : new TextEncoder().encode(inode.content as string);

        if (desc.position >= content.length) {
            return { code: WASI_ESUCCESS, data: new Uint8Array(0) }; // EOF
        }

        const end = Math.min(desc.position + length, content.length);
        const chunk = content.slice(desc.position, end);
        desc.position += chunk.length;

        return { code: WASI_ESUCCESS, data: chunk };
    }

    /**
     * wasi: fd_close
     */
    fd_close(fd: number): number {
        if (this.fileDescriptors.has(fd)) {
            this.fileDescriptors.delete(fd);
            return WASI_ESUCCESS;
        }
        return WASI_EBADF;
    }

    /**
     * wasi: fd_seek
     */
    fd_seek(fd: number, offset: number | bigint, whence: number): { code: number, new_offset: bigint } {
        const desc = this.fileDescriptors.get(fd);
        if (!desc) return { code: WASI_EBADF, new_offset: BigInt(0) };

        let newPos = desc.position;
        const off = Number(offset);

        // 0: SET, 1: CUR, 2: END
        if (whence === 0) {
            newPos = off;
        } else if (whence === 1) {
            newPos += off;
        } else if (whence === 2) {
            const inode = this.service.getInode(desc.inodeId);
            if (inode) {
                newPos = inode.size + off;
            }
        }

        desc.position = newPos;
        return { code: WASI_ESUCCESS, new_offset: BigInt(newPos) };
    }
}
