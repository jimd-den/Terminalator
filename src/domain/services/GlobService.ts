/**
 * GlobService - Domain Service
 *
 * Implements POSIX Pathname Expansion (Globbing).
 * Matches patterns: *, ?, [...] against the filesystem.
 *
 * Pillar: The Four-Fold Shield (Use Case/Service Layer)
 */

import { FileSystemService } from './FileSystemService';
import { Dentry } from '../entities/FileSystem';
import { DirectoryNode } from '../entities/filesystem/DirectoryNode';

export class GlobService {
    constructor(private fs: FileSystemService) { }

    /**
     * Expands a glob pattern into a list of matching file paths.
     * Returns the pattern itself if no matches are found.
     *
     * @param pattern The glob pattern (e.g. "*.ts", "/bin/?sh")
     * @param cwd Current working directory
     */
    expand(pattern: string, cwd: string): string[] {
        // 1. Split pattern
        const isAbsolute = pattern.startsWith('/');
        const parts = pattern.split('/').filter(p => p.length > 0);

        // 2. Start recursion
        // If absolute, start at root ('/')
        // If relative, start at cwd (but we return relative paths? No, usually shells return path as provided but expanded)
        // If pattern was relative, result is relative. If absolute, result is absolute.

        const rootPath = isAbsolute ? '/' : cwd;

        let matches: string[] = [];

        if (isAbsolute) {
            matches = this.matchRecursive('/', parts);
        } else {
            // For relative, we match recursively from CWD BUT we need to prefix output properly.
            // Actually, simplest is to resolve CWD to absolute, match, and then make relative again?
            // Or maintain "current search path" and "current relative path prefix".

            // Let's use a helper that takes (currentAbsPath, remainingParts, currentRelPath)
            matches = this.matchRecursive(cwd, parts, '');
        }

        if (matches.length === 0) {
            return [pattern];
        }

        // 3. Sort matches (POSIX requirement)
        matches.sort((a, b) => a.localeCompare(b));

        return matches;
    }

    private matchRecursive(currentPath: string, parts: string[], accumulatedPath: string = ''): string[] {
        if (parts.length === 0) {
            // End of pattern.
            // If accumulatedPath is empty, it means we matched root? Or nothing?
            // If absolute, accumulatedPath should be the full path.
            // If relative, it should be the relative build up.
            return [accumulatedPath || (currentPath === '/' ? '/' : currentPath)];
        }

        const [head, ...tail] = parts;
        const results: string[] = [];

        // Check if head contains wildcards
        if (!this.hasWildcard(head)) {
            // Literal match
            // Resolve next node
            const nextPath = currentPath === '/' ? `/${head}` : `${currentPath}/${head}`;
            // If relative, accumulation:
            const nextAcc = accumulatedPath ? `${accumulatedPath}/${head}` : (currentPath === '/' ? `/${head}` : head);
            // Wait, logic for accumulation:
            // If we started absolute, accumulatedPath is built as absolute.
            // If we started relative, accumulatedPath starts empty.

            // Adjust nextAcc logic:
            let nextAccumulated = '';
            if (accumulatedPath === '') {
                // Initial step
                nextAccumulated = currentPath === '/' ? `/${head}` : head;
                // Careful: if currentPath is CWD (e.g. /home), and head is 'foo', nextAcc for relative should be 'foo'.
                // If absolute, currentPath='/'.
                if (currentPath !== '/') {
                    // We are in relative mode.
                    nextAccumulated = head;
                }
            } else {
                nextAccumulated = `${accumulatedPath}/${head}`;
            }

            // Verify existence
            const node = this.fs.resolve(nextPath);
            if (node) {
                if (tail.length === 0) {
                    results.push(nextAccumulated);
                } else {
                    if (this.fs.isDirectory(node)) {
                        results.push(...this.matchRecursive(nextPath, tail, nextAccumulated));
                    }
                    // Else: not a dir but more parts -> no match
                }
            }
        } else {
            // Wildcard match
            // Read directories in currentPath
            const dirNode = this.fs.resolve(currentPath);
            if (!dirNode || !this.fs.isDirectory(dirNode)) return [];

            const children = Array.from((dirNode as DirectoryNode).children.values());

            for (const child of children) {
                const name = child.name;

                // Hidden file check: * does not match .hidden unless pattern starts with .
                if (name.startsWith('.') && !head.startsWith('.')) {
                    continue;
                }

                if (this.matchesPattern(name, head)) {
                    const nextPath = currentPath === '/' ? `/${name}` : `${currentPath}/${name}`;

                    let nextAccumulated = '';
                    if (accumulatedPath === '') {
                        if (currentPath !== '/') nextAccumulated = name; // Relative start
                        else nextAccumulated = `/${name}`; // Absolute start
                    } else {
                        nextAccumulated = `${accumulatedPath}/${name}`;
                    }

                    if (tail.length === 0) {
                        results.push(nextAccumulated);
                    } else {
                        if (this.fs.isDirectory(child)) {
                            results.push(...this.matchRecursive(nextPath, tail, nextAccumulated));
                        }
                    }
                }
            }
        }

        return results;
    }

    private hasWildcard(str: string): boolean {
        return str.includes('*') || str.includes('?') || str.includes('[');
    }

    private matchesPattern(str: string, pattern: string): boolean {
        // Convert POSIX glob pattern to Regex
        // Escape regex characters except * ? [ ]
        // * -> .*
        // ? -> .
        // [abc] -> [abc]
        // [!abc] -> [^abc]

        let regexStr = '^';
        let i = 0;

        while (i < pattern.length) {
            const char = pattern[i];

            if (char === '*') {
                regexStr += '.*';
                i++;
            } else if (char === '?') {
                regexStr += '.';
                i++;
            } else if (char === '[') {
                // Find closing ]
                let j = i + 1;
                // POSIX: "]" can be first char in class: []abc]
                if (j < pattern.length && pattern[j] === ']') j++; // skip first ]

                while (j < pattern.length && pattern[j] !== ']') j++;

                if (j >= pattern.length) {
                    // No closing ], treat as literal [
                    regexStr += '\\[';
                    i++;
                } else {
                    let cls = pattern.substring(i, j + 1); // [ ... ]
                    // Handle negation ! -> ^
                    if (cls.startsWith('[!')) {
                        cls = '[^' + cls.substring(2);
                    }
                    // Escape other regex chars inside class?
                    // Generally inside [] regex is similar, but things like \ need care.
                    // Simplified: pass direct.
                    regexStr += cls;
                    i = j + 1;
                }
            } else {
                // Escape regex chars
                if (".+^${}()|\\".includes(char)) {
                    regexStr += '\\' + char;
                } else {
                    regexStr += char;
                }
                i++;
            }
        }

        regexStr += '$';
        return new RegExp(regexStr).test(str);
    }
}
