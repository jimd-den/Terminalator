/**
 * PathResolver Service - Domain Layer
 *
 * Responsible for traversing the directory tree and resolving paths to Dentries.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Balanced Scale (SRP)
 *
 * Intent:
 * Decouples "Path Navigation" logic from "Storage" (InodeTable) and "Public API" (FileSystem).
 * Handles complex logic like `..`, `.`, and Symlink resolution.
 */

import { Dentry, S_IFLNK } from '../../entities/filesystem/FileSystemTypes';
import { InodeTable } from '../../entities/filesystem/InodeTable';

export class PathResolver {
    constructor(private inodeTable: InodeTable) {}

    /**
     * Resolves a path string to a Dentry.
     *
     * @param root - The root Dentry of the filesystem.
     * @param path - The path to resolve.
     * @param cwd - The current working directory path.
     * @param followSymlinks - Whether to follow symlinks at the *end* of the path.
     * @returns The resolved Dentry or null.
     */
    resolve(root: Dentry, path: string, cwd: string = '/', followSymlinks: boolean = true): Dentry | null {
        if (!path) return null;

        // 1. Determine Start Node
        let startNode: Dentry;
        if (path.startsWith('/')) {
            startNode = root;
        } else {
            // Recursive resolve of cwd (always absolute from root)
            // We assume cwd is valid. If not, fallback to root.
            const resolvedCwd = this.resolve(root, cwd, '/', true);
            if (!resolvedCwd) return null;
            startNode = resolvedCwd;
        }

        // 2. Parse Path Parts
        const parts = path.split('/').filter(p => p.length > 0 && p !== '.');
        let current = startNode;
        let symlinkCount = 0;
        const MAX_SYMLINKS = 40;

        // 3. Traverse
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

                // Check Inode Type (Symlink?)
                const inode = this.inodeTable.get(next.inodeId);
                if (!inode) return null; // Corrupt state

                // Determine if we should follow symlink
                // We always follow intermediate symlinks.
                // We only optionally follow the LAST component.
                const isLast = (i === parts.length - 1);
                const shouldFollow = !isLast || followSymlinks;

                if (shouldFollow && (inode.mode & S_IFLNK) && inode.target) {
                    if (symlinkCount++ > MAX_SYMLINKS) throw new Error('Too many levels of symbolic links');

                    const target = inode.target;
                    let targetNode: Dentry | null;

                    if (target.startsWith('/')) {
                        targetNode = this.resolve(root, target, '/', true);
                    } else {
                        const currentAbs = this.getAbsolutePath(current);
                        targetNode = this.resolve(root, target, currentAbs, true);
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

    /**
     * Reconstructs the absolute path of a Dentry.
     */
    getAbsolutePath(dentry: Dentry): string {
        const parts: string[] = [];
        let current: Dentry | null = dentry;
        while (current && current.parent) {
            parts.unshift(current.name);
            current = current.parent;
        }
        return parts.length === 0 ? '/' : '/' + parts.join('/');
    }
}
