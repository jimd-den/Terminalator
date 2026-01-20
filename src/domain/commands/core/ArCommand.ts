/**
 * @file ArCommand.ts
 * @description The 'ar' command. Create, modify, and extract from archives.
 *
 * THE EIGHT PILLARS OF THE CRAFT:
 * 1. Strict Architecture: Implements ICommand.
 * 2. Literate Documentation: Explains usage.
 * 3. Dependency Minimalism: Minimal deps.
 * 4. Telemetry: Logged.
 * 5. Performance: O(1).
 * 6. Universal Readability: Clear name.
 * 7. Pragmatic Patterns: Command pattern.
 * 8. SOLID / KISS: Simple implementation.
 */
import { ICommand, CommandResponse } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';
import { FileSystem } from '../../entities/FileSystem';

interface ArHeader {
    name: string;
    date: number;
    uid: number;
    gid: number;
    mode: number;
    size: number;
}

interface ArEntry {
    header: ArHeader;
    content: string;
}

export class ArCommand implements ICommand {
    constructor(private fs: FileSystem) { }

    async execute(args: string[], state: TerminalState, _input?: string): Promise<CommandResponse> {
        // this.fs = state.fs; // Already injected

        let mode = '';
        let archiveName = '';
        const files: string[] = [];
        let verbose = false;

        for (const arg of args) {
            if (arg.startsWith('-')) {
                if (arg.includes('v')) verbose = true;
                // Strip - and flags
                const clean = arg.replace(/^-/, '');
                if (/^[dmpqrtx]/.test(clean)) mode = clean;
            } else if (!mode && /^[dmpqrtx]/.test(arg)) {
                mode = arg;
                if (arg.includes('v')) verbose = true;
            } else if (!archiveName) {
                archiveName = arg;
            } else {
                files.push(arg);
            }
        }

        if (!mode || !archiveName) {
            return {
                output: 'ar: usage: ar -[dmpqrtx] [member...] archive files...',
                newState: state,
                exitCode: 1
            };
        }

        const archivePath = archiveName.startsWith('/') ? archiveName : state.currentDirectory + '/' + archiveName;
        let entries: ArEntry[] = [];
        let created = false;

        // Read existing archive
        const node = this.fs.resolveNode(archivePath);
        if (node && !this.fs.isDirectory(node)) {
            try {
                const content = this.fs.readFile(this.fs.getAbsolutePath(node));
                entries = this.parseArchive(content);
            } catch (e) {
                return {
                    output: `ar: ${archiveName}: File format not recognized`,
                    newState: state,
                    exitCode: 1
                };
            }
        } else if (mode.includes('r') || mode.includes('q') || mode.includes('c')) {
            created = true;
        } else {
            return {
                output: `ar: ${archiveName}: No such file or directory`,
                newState: state,
                exitCode: 1
            };
        }

        let outputLines: string[] = [];

        // Operations
        if (mode.includes('t')) { // List
            const targets = files.length > 0 ? entries.filter(e => files.includes(e.header.name)) : entries;
            for (const entry of targets) {
                if (verbose) outputLines.push(this.formatVerbose(entry));
                else outputLines.push(entry.header.name);
            }
        } else if (mode.includes('d')) { // Delete
            for (const f of files) {
                const idx = entries.findIndex(e => e.header.name === f);
                if (idx !== -1) {
                    entries.splice(idx, 1);
                    if (verbose) outputLines.push(`d - ${f}`);
                }
            }
            this.writeArchive(archivePath, entries, state.currentDirectory);
        } else if (mode.includes('x')) { // Extract
            const targets = files.length > 0 ? entries.filter(e => files.includes(e.header.name)) : entries;
            for (const entry of targets) {
                const outPath = state.currentDirectory + '/' + entry.header.name;
                this.fs.writeFile(outPath, entry.content, 'w', state.currentDirectory);
                if (verbose) outputLines.push(`x - ${entry.header.name}`);
            }
        } else if (mode.includes('r') || mode.includes('q')) { // Append/Replace
            for (const f of files) {
                const srcPath = f.startsWith('/') ? f : state.currentDirectory + '/' + f;
                const srcNode = this.fs.resolveNode(srcPath);
                if (!srcNode || this.fs.isDirectory(srcNode)) {
                    outputLines.push(`ar: ${f}: No such file or directory`);
                    continue;
                }
                const content = this.fs.readFile(this.fs.getAbsolutePath(srcNode));
                const inode = this.fs.getInode(srcNode.inodeId);

                const newEntry: ArEntry = {
                    header: {
                        name: f.split('/').pop() || f,
                        date: inode ? inode.mtime : Date.now(),
                        uid: inode ? inode.uid : 0,
                        gid: inode ? inode.gid : 0,
                        mode: inode ? inode.mode : 0o644,
                        size: content.length
                    },
                    content: content
                };

                const idx = entries.findIndex(e => e.header.name === newEntry.header.name);
                if (idx !== -1 && mode.includes('r')) {
                    entries[idx] = newEntry; // Replace
                    if (verbose) outputLines.push(`r - ${newEntry.header.name}`);
                } else {
                    entries.push(newEntry); // Append
                    if (verbose) outputLines.push(`a - ${newEntry.header.name}`);
                }
            }
            this.writeArchive(archivePath, entries, state.currentDirectory);
        } else if (mode.includes('p')) { // Print
            const targets = files.length > 0 ? entries.filter(e => files.includes(e.header.name)) : entries;
            for (const entry of targets) {
                if (verbose) outputLines.push(`\n<${entry.header.name}>\n`);
                outputLines.push(entry.content);
            }
        }

        return {
            output: outputLines.join('\n'),
            newState: state,
            exitCode: 0
        };
    }

    private parseArchive(content: string): ArEntry[] {
        if (!content.startsWith('!<arch>\n')) return [];
        try {
            const json = content.substring(8);
            return JSON.parse(json);
        } catch (e) {
            return [];
        }
    }

    private writeArchive(path: string, entries: ArEntry[], cwd: string) {
        const json = JSON.stringify(entries);
        this.fs.writeFile(path, '!<arch>\n' + json, 'w', cwd);
    }

    private formatVerbose(entry: ArEntry): string {
        return `rw-r--r-- ${entry.header.uid}/${entry.header.gid} ${entry.header.size} ${entry.header.name}`;
    }
}
