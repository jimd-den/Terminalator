/**
 * LsCommand - Core Command
 *
 * Lists directory contents.
 * Supports -a (all) and -F (classify).
 *
 * Pillar: The Swift Stream (Performance & Purity)
 * Pillar: The Balanced Scale (SOLID / KISS)
 */

import { ICommand } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystemService } from '../../services/FileSystemService';

export class LsCommand implements ICommand {
    constructor(private fs: FileSystemService) { }

    execute(args: string[], state: TerminalState, input?: string): CommandResponse {
        const flags = args.filter(arg => arg.startsWith('-'));
        const targets = args.filter(arg => !arg.startsWith('-'));

        const showHidden = flags.some(f => f.includes('a'));
        const classify = flags.some(f => f.includes('F'));
        const recursive = flags.some(f => f.includes('R'));
        const longFormat = flags.some(f => f.includes('l'));
        const onePerLine = flags.some(f => f.includes('1'));

        let exitCode = 0;
        let outputParts: string[] = [];

        const pathsToProcess = targets.length > 0 ? targets : [''];

        // Helper for recursive listing
        const listDirectory = (dirNode: any, dirPath: string, printHeader: boolean) => {
            // Print header if needed (for recursive or multi-arg)
            if (printHeader) {
                outputParts.push(`\n${dirPath}:`);
            }

            let files = Array.from(dirNode.children.values() as Iterable<any>);

            if (!showHidden) {
                files = files.filter(f => !f.name.startsWith('.'));
            }

            files.sort((a: any, b: any) => a.name.localeCompare(b.name));

            if (files.length === 0) {
                // Even if empty, we might need to recurse if there were subdirs (but empty means no subdirs)
                return;
            }

            const formattedNames = files.map(f => {
                let name = f.name;
                if (classify && this.fs.isDirectory(f)) {
                    name += '/';
                }

                if (longFormat) {
                    // -rw-r--r-- 1 operator operator 123 Jan 1 00:00 name
                    const isDir = this.fs.isDirectory(f);
                    const type = isDir ? 'd' : '-';
                    const perm = 'rw-r--r--';
                    const user = 'operator';
                    const group = 'operator';
                    const stats = this.fs.getStat(f);
                    const size = stats ? stats.size : 0;
                    const date = 'Jan 1 00:00';
                    return `${type}${perm} 1 ${user} ${group} ${size} ${date} ${name}`;
                }

                return name;
            });

            if (longFormat || onePerLine) {
                outputParts.push(formattedNames.join('\n'));
            } else {
                outputParts.push(formattedNames.join('  '));
            }

            if (recursive) {
                for (const f of files) {
                    if (this.fs.isDirectory(f)) {
                        if (f.name === '.' || f.name === '..') continue;
                        // Construct path for recursion
                        let childPath;
                        if (dirPath === '/') {
                            childPath = `/${f.name}`;
                        } else {
                            childPath = `${dirPath}/${f.name}`;
                        }
                        listDirectory(f, childPath, true);
                    }
                }
            }
        };

        for (const targetPath of pathsToProcess) {
            let pathToList = targetPath || state.currentDirectory;

            // Resolve the node
            const node = this.fs.resolve(pathToList, state.currentDirectory);

            if (!node) {
                outputParts.push(`ls: cannot access '${targetPath}': No such file or directory`);
                exitCode = 1;
                continue;
            }

            if (!this.fs.isDirectory(node)) {
                // It's a file
                if (longFormat) {
                    const type = '-';
                    const perm = 'rw-r--r--';
                    const user = 'operator';
                    const group = 'operator';
                    const stats = this.fs.getStat(node);
                    const size = stats ? stats.size : 0;
                    const date = 'Jan 1 00:00';
                    const name = targetPath || node.name;
                    outputParts.push(`${type}${perm} 1 ${user} ${group} ${size} ${date} ${name}`);
                } else {
                    outputParts.push(targetPath || node.name);
                }
                continue;
            }

            // Is directory
            // Determine if we need an initial header
            let printInitialHeader = pathsToProcess.length > 1;

            // Get display path
            let displayPath = targetPath;
            if (!displayPath) {
                // If no args, we are listing CWD.
                if (recursive) {
                    displayPath = '.';
                    printInitialHeader = true; // Force header for root if recursive
                }
            }

            listDirectory(node, displayPath || pathToList, printInitialHeader);
        }

        // Clean up initial newlines if any
        let finalOutput = outputParts.join('\n').trim();

        return {
            output: finalOutput,
            newState: state,
            exitCode: exitCode
        };
    }
}
