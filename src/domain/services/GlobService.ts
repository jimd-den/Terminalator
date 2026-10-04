/**
 * GlobService - Domain Service
 *
 * POSIX pathname expansion (XCU §2.13.3). Patterns may contain backslash
 * escapes (produced by the word expander for quoted characters).
 *
 * - Each '/'-separated component is matched against directory entries.
 * - A leading '.' in a filename must be matched explicitly.
 * - Results are sorted; no match yields an empty list (the caller then
 *   keeps the word unchanged, as the shell requires).
 */

import { FileSystemService } from './FileSystemService';
import { DirectoryNode } from '../entities/filesystem/DirectoryNode';
import { hasPatternChars, matchPattern, unescapePattern } from './shell/expansion/PatternMatcher';

export class GlobService {
    constructor(private fs: FileSystemService) { }

    expand(pattern: string, cwd: string): string[] {
        if (!hasPatternChars(pattern)) return [];
        const absolute = pattern.startsWith('/');
        const components = this.splitComponents(pattern);

        let candidates: string[] = [absolute ? '/' : ''];
        for (let idx = 0; idx < components.length; idx++) {
            const comp = components[idx];
            const isLast = idx === components.length - 1;
            const next: string[] = [];

            for (const prefix of candidates) {
                const dirPath = prefix === '' ? cwd : prefix;
                if (!hasPatternChars(comp)) {
                    const name = unescapePattern(comp);
                    const candidate = this.join(prefix, name);
                    if (isLast || this.isDirectory(candidate, cwd)) {
                        if (this.fs.resolve(candidate, cwd)) next.push(candidate);
                    }
                    continue;
                }
                for (const name of this.list(dirPath, cwd)) {
                    if (name.startsWith('.') && !comp.startsWith('.') && !comp.startsWith('\\.')) continue;
                    if (!matchPattern(comp, name)) continue;
                    const candidate = this.join(prefix, name);
                    if (!isLast && !this.isDirectory(candidate, cwd)) continue;
                    next.push(candidate);
                }
            }
            candidates = next;
            if (candidates.length === 0) return [];
        }

        const trailingSlash = pattern.endsWith('/');
        return candidates
            .map(c => (trailingSlash && !c.endsWith('/') ? c + '/' : c))
            .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    }

    private splitComponents(pattern: string): string[] {
        return pattern.split('/').filter(c => c.length > 0);
    }

    private join(prefix: string, name: string): string {
        if (prefix === '') return name;
        if (prefix.endsWith('/')) return prefix + name;
        return `${prefix}/${name}`;
    }

    private isDirectory(path: string, cwd: string): boolean {
        const node = this.fs.resolve(path, cwd);
        return !!node && this.fs.isDirectory(node);
    }

    private list(dirPath: string, cwd: string): string[] {
        const node = this.fs.resolve(dirPath, cwd);
        if (!node || !(node instanceof DirectoryNode)) return [];
        return Array.from(node.children.keys());
    }
}
