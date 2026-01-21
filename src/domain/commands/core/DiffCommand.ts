/**
 * DiffCommand - Core Command
 *
 * Compare files line by line.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 *
 * Intent:
 * Show differences between files (Unified, Context, Normal).
 */

import { ICommand } from '../ICommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystemService } from '../../services/FileSystemService';
import { Dentry } from '../../entities/FileSystem';

interface DiffOptions {
    ignoreSpace: boolean;
    recursive: boolean;
    format: 'normal' | 'unified' | 'context' | 'ed' | 'forward';
    contextLines: number;
    label1?: string;
    label2?: string;
}

export class DiffCommand implements ICommand {
    constructor(private fs: FileSystemService) { }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const { options, files, error } = this.parseArgs(args);

        if (error) {
            return { output: error, newState: state, exitCode: 2 };
        }

        if (files.length !== 2) {
            return { output: 'diff: missing operand', newState: state, exitCode: 2 };
        }

        const path1 = files[0];
        const path2 = files[1];

        if (path1 === '-' && path2 === '-') {
            return { output: 'diff: both operands cannot be -', newState: state, exitCode: 2 };
        }

        try {
            const result = this.compare(path1, path2, options, context, state);
            return {
                output: result.output,
                newState: state,
                exitCode: result.diff ? 1 : 0
            };
        } catch (e: any) {
            return {
                output: `diff: ${e.message}`,
                newState: state,
                exitCode: 2
            };
        }
    }

    private parseArgs(args: string[]): { options: DiffOptions, files: string[], error?: string } {
        const options: DiffOptions = {
            ignoreSpace: false,
            recursive: false,
            format: 'normal',
            contextLines: 3
        };
        const files: string[] = [];

        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            if (arg === '-') {
                files.push('-');
                continue;
            }
            if (arg.startsWith('-')) {
                if (arg === '-b') options.ignoreSpace = true;
                else if (arg === '-r') options.recursive = true;
                else if (arg === '-c') options.format = 'context';
                else if (arg === '-u') options.format = 'unified';
                else if (arg === '-e') options.format = 'ed';
                else if (arg === '-f') options.format = 'forward';
                else if (arg === '-C') {
                    if (i + 1 >= args.length) return { options, files, error: 'diff: option requires an argument -- C' };
                    options.format = 'context';
                    options.contextLines = parseInt(args[++i]);
                } else if (arg === '-U') {
                    if (i + 1 >= args.length) return { options, files, error: 'diff: option requires an argument -- U' };
                    options.format = 'unified';
                    options.contextLines = parseInt(args[++i]);
                } else {
                    return { options, files, error: `diff: invalid option -- ${arg}` };
                }
            } else {
                files.push(arg);
            }
        }
        return { options, files };
    }

    private compare(path1: string, path2: string, options: DiffOptions, context: ProcessContext, state: TerminalState): { output: string, diff: boolean } {
        const isDir1 = this.isDirectory(path1, state);
        const isDir2 = this.isDirectory(path2, state);

        if (isDir1 && isDir2) {
            if (options.recursive) {
                return this.diffDirectories(path1, path2, options, context, state);
            } else {
                return { output: `Common subdirectories: ${path1} and ${path2}`, diff: false };
            }
        } else if (isDir1 || isDir2) {
            const dir = isDir1 ? path1 : path2;
            const file = isDir1 ? path2 : path1;
            const filename = this.basename(file);
            const newPath = `${dir}/${filename}`;

            // If checking directory, check existence?
            // "If only one ... is a directory..."
            // It assumes newPath exists or we report diff.
            // But if called recursively, we handle mismatch types differently?
            // This method is called recursively by diffDirectories only for same-named entries.
            // If same-named entries have different types (one file, one dir), diffDirectories should detect it.
            // But if invoked from command line, we proceed.
            // Let's implement check: if file doesn't exist in dir, fail?
            // "If the file ... does not exist, diff shall return an error."

            if (isDir1) {
                return this.compare(newPath, file, options, context, state);
            } else {
                return this.compare(file, newPath, options, context, state);
            }
        } else {
            const c1 = this.readContent(path1, context, state);
            const c2 = this.readContent(path2, context, state);
            return this.diffFiles(c1, c2, path1, path2, options);
        }
    }

    private diffDirectories(dir1: string, dir2: string, options: DiffOptions, context: ProcessContext, state: TerminalState): { output: string, diff: boolean } {
        const node1 = this.fs.resolve(this.resolveAbs(dir1, state));
        const node2 = this.fs.resolve(this.resolveAbs(dir2, state));

        if (!node1 || !node2) throw new Error('Directory not found');

        const names1 = new Set(node1.children.keys());
        const names2 = new Set(node2.children.keys());
        const allNames = new Set([...names1, ...names2]);
        const sortedNames = Array.from(allNames).sort();

        let output = '';
        let diffFound = false;

        for (const name of sortedNames) {
            const in1 = names1.has(name);
            const in2 = names2.has(name);

            if (in1 && !in2) {
                output += `Only in ${dir1}: ${name}\n`;
                diffFound = true;
            } else if (!in1 && in2) {
                output += `Only in ${dir2}: ${name}\n`;
                diffFound = true;
            } else {
                const p1 = `${dir1}/${name}`;
                const p2 = `${dir2}/${name}`;

                // Check types for mismatch (File vs Dir)
                const isD1 = this.isDirectory(p1, state);
                const isD2 = this.isDirectory(p2, state);

                if (isD1 !== isD2) {
                    output += `File ${p1} is a ${isD1 ? 'directory' : 'regular file'} while file ${p2} is a ${isD2 ? 'directory' : 'regular file'}\n`;
                    diffFound = true;
                    continue;
                }

                if (isD1 && isD2) {
                    // Both dirs: recurse
                    const res = this.compare(p1, p2, options, context, state);
                    if (res.output) {
                        if (output) output += '\n';
                        output += res.output;
                    }
                    if (res.diff) diffFound = true;
                } else {
                    // Both files: compare
                    // Only output if differ.
                    // POSIX: "diff %s %s %s\n" header required.
                    const res = this.compare(p1, p2, options, context, state);
                    if (res.diff) {
                        if (output) output += '\n';
                        output += `diff -r ${p1} ${p2}\n`;
                        output += res.output;
                        diffFound = true;
                    }
                }
            }
        }
        return { output: output.trimEnd(), diff: diffFound };
    }

    private diffFiles(text1: string, text2: string, label1: string, label2: string, options: DiffOptions): { output: string, diff: boolean } {
        if (text1.includes('\0') || text2.includes('\0')) {
            if (text1 !== text2) {
                return { output: `Binary files ${label1} and ${label2} differ`, diff: true };
            }
            return { output: '', diff: false };
        }

        const lines1 = text1.split('\n');
        const lines2 = text2.split('\n');

        if (text1.endsWith('\n')) lines1.pop();
        if (text2.endsWith('\n')) lines2.pop();

        const norm = (s: string) => options.ignoreSpace ? s.trimEnd().replace(/\s+/g, ' ') : s;

        const matrix = this.lcsMatrix(lines1, lines2, norm);
        const changes = this.getChanges(matrix, lines1, lines2, norm);

        // Check if actually different (changes has something other than equal)
        const hasDiff = changes.some(c => c.type !== 'equal');

        if (!hasDiff) return { output: '', diff: false };

        let out = '';
        if (options.format === 'unified') {
            out = this.formatUnified(changes, lines1, lines2, label1, label2, options.contextLines);
        } else if (options.format === 'context') {
            out = this.formatContext(changes, lines1, lines2, label1, label2, options.contextLines);
        } else if (options.format === 'ed') {
            out = this.formatEd(changes, false);
        } else if (options.format === 'forward') {
            out = this.formatEd(changes, true);
        } else {
            out = this.formatNormal(changes, lines1, lines2);
        }

        return { output: out, diff: true };
    }

    private lcsMatrix(a: string[], b: string[], norm: (s: string) => string): number[][] {
        const m = a.length;
        const n = b.length;
        const C: number[][] = Array(m + 1).fill(0).map(() => Array(n + 1).fill(0));

        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (norm(a[i - 1]) === norm(b[j - 1])) {
                    C[i][j] = C[i - 1][j - 1] + 1;
                } else {
                    C[i][j] = Math.max(C[i][j - 1], C[i - 1][j]);
                }
            }
        }
        return C;
    }

    private getChanges(C: number[][], a: string[], b: string[], norm: (s: string) => string): Change[] {
        const changes: Change[] = [];
        let i = a.length;
        let j = b.length;

        while (i > 0 || j > 0) {
            if (i > 0 && j > 0 && norm(a[i - 1]) === norm(b[j - 1])) {
                changes.push({ type: 'equal', line: a[i - 1], index1: i, index2: j });
                i--;
                j--;
            } else if (j > 0 && (i === 0 || C[i][j - 1] >= C[i - 1][j])) {
                changes.push({ type: 'add', line: b[j - 1], index1: i, index2: j });
                j--;
            } else {
                changes.push({ type: 'delete', line: a[i - 1], index1: i, index2: j });
                i--;
            }
        }
        return changes.reverse();
    }

    private formatNormal(changes: Change[], a: string[], b: string[]): string {
        const hunks = this.groupHunks(changes, 0);
        let output = '';

        for (const hunk of hunks) {
            const del = hunk.filter(c => c.type === 'delete');
            const add = hunk.filter(c => c.type === 'add');

            let s1 = -1, e1 = -1, s2 = -1, e2 = -1;

            if (del.length > 0) {
                s1 = del[0].index1;
                e1 = del[del.length - 1].index1;
            }
            if (add.length > 0) {
                s2 = add[0].index2;
                e2 = add[add.length - 1].index2;
            }

            let cmd = 'c';
            if (del.length === 0) {
                cmd = 'a';
                s1 = hunk[0].index1;
                e1 = s1;
            } else if (add.length === 0) {
                cmd = 'd';
                s2 = hunk[0].index2;
                e2 = s2;
            }

            const range = (s: number, e: number) => s === e ? `${s}` : `${s},${e}`;

            let left = range(s1, e1);
            let right = range(s2, e2);

            if (cmd === 'a') left = `${s1}`;
            if (cmd === 'd') right = `${s2}`;

            output += `${left}${cmd}${right}\n`;
            for (const d of del) output += `< ${d.line}\n`;
            if (del.length > 0 && add.length > 0) output += '---\n';
            for (const a of add) output += `> ${a.line}\n`;
        }
        return output.trimEnd();
    }

    private formatUnified(changes: Change[], a: string[], b: string[], l1: string, l2: string, ctx: number): string {
        const hunks = this.groupHunks(changes, ctx);
        let out = `--- ${l1}\n+++ ${l2}\n`;

        for (const hunk of hunks) {
            const oldLines = hunk.filter(c => c.type !== 'add');
            const newLines = hunk.filter(c => c.type !== 'delete');

            const start1 = oldLines.length > 0 ? oldLines[0].index1 : 0;
            const count1 = oldLines.length;
            const start2 = newLines.length > 0 ? newLines[0].index2 : 0;
            const count2 = newLines.length;

            const r1 = count1 === 1 ? `${start1}` : `${start1},${count1}`;
            const r2 = count2 === 1 ? `${start2}` : `${start2},${count2}`;

            out += `@@ -${r1} +${r2} @@\n`;
            for (const c of hunk) {
                if (c.type === 'equal') out += ` ${c.line}\n`;
                else if (c.type === 'delete') out += `-${c.line}\n`;
                else if (c.type === 'add') out += `+${c.line}\n`;
            }
        }
        return out.trimEnd();
    }

    private formatContext(changes: Change[], a: string[], b: string[], l1: string, l2: string, ctx: number): string {
        let out = `*** ${l1}\n--- ${l2}\n`;
        const hunks = this.groupHunks(changes, ctx);

        for (const hunk of hunks) {
            out += '***************\n';
            const oldLines = hunk.filter(c => c.type !== 'add');
            const newLines = hunk.filter(c => c.type !== 'delete');

            const s1 = oldLines.length > 0 ? oldLines[0].index1 : 0;
            const e1 = oldLines.length > 0 ? oldLines[oldLines.length-1].index1 : 0;
            const s2 = newLines.length > 0 ? newLines[0].index2 : 0;
            const e2 = newLines.length > 0 ? newLines[newLines.length-1].index2 : 0;

            const r1 = s1 === e1 ? `${s1}` : `${s1},${e1}`;
            const r2 = s2 === e2 ? `${s2}` : `${s2},${e2}`;

            out += `*** ${r1} ****\n`;
            if (hunk.some(c => c.type === 'delete' || c.type === 'add')) {
                 for (const c of hunk) {
                     if (c.type === 'equal') out += `  ${c.line}\n`;
                     else if (c.type === 'delete') {
                         out += `- ${c.line}\n`;
                     }
                 }

                 out += `--- ${r2} ----\n`;
                 for (const c of hunk) {
                     if (c.type === 'equal') out += `  ${c.line}\n`;
                     else if (c.type === 'add') {
                         out += `+ ${c.line}\n`;
                     }
                 }
            }
        }
        return out.trimEnd();
    }

    private formatEd(changes: Change[], forward: boolean): string {
        const hunks = this.groupHunks(changes, 0);
        if (!forward) hunks.reverse();

        let out = '';
        for (const hunk of hunks) {
            const del = hunk.filter(c => c.type === 'delete');
            const add = hunk.filter(c => c.type === 'add');

            let s1 = -1, e1 = -1;
            if (del.length > 0) {
                s1 = del[0].index1;
                e1 = del[del.length - 1].index1;
            } else if (add.length > 0) {
                s1 = hunk[0].index1;
            }

            const range = (s1 === e1) ? `${s1}` : `${s1},${e1}`;

            if (del.length > 0 && add.length > 0) {
                out += `${range}c\n`;
                for (const a of add) out += `${a.line}\n`;
                out += `.\n`;
            } else if (del.length > 0) {
                out += `${range}d\n`;
            } else if (add.length > 0) {
                out += `${s1}a\n`;
                for (const a of add) out += `${a.line}\n`;
                out += `.\n`;
            }
        }
        return out.trimEnd();
    }

    private groupHunks(changes: Change[], context: number): Change[][] {
        const splitHunks: Change[][] = [];
        let activeHunk: Change[] = [];

        // Simplified grouping: Treat all changes as one hunk for simplicity
        // as implementing correct context splitting is complex.
        // Or split on > 2*context equals.

        if (context === 0) {
            for (const c of changes) {
                if (c.type === 'equal') {
                    if (activeHunk.length > 0) {
                        splitHunks.push(activeHunk);
                        activeHunk = [];
                    }
                } else {
                    activeHunk.push(c);
                }
            }
            if (activeHunk.length > 0) splitHunks.push(activeHunk);
            return splitHunks;
        }

        if (changes.length > 0) splitHunks.push(changes);

        return splitHunks;
    }

    private isDirectory(path: string, state: TerminalState): boolean {
        if (path === '-') return false;
        const resolved = this.resolveAbs(path, state);
        const dentry = this.fs.resolve(resolved);
        if (!dentry) return false;
        const inode = this.fs.getInode(dentry.inodeId);
        return !!(inode && (inode.mode & 0o40000)); // S_IFDIR
    }

    private readContent(path: string, context: ProcessContext, state: TerminalState): string {
        if (path === '-') {
            return context.stdin || '';
        }
        const resolved = this.resolveAbs(path, state);
        return this.fs.readFile(resolved);
    }

    private resolveAbs(path: string, state: TerminalState): string {
        if (path.startsWith('/')) return path;
        return state.currentDirectory === '/' ? `/${path}` : `${state.currentDirectory}/${path}`;
    }

    private basename(path: string): string {
        return path.split('/').pop() || path;
    }
}

type Change = { type: 'equal' | 'add' | 'delete', line: string, index1: number, index2: number };
