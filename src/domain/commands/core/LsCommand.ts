import { getStdinAsString } from '../../entities/ProcessContext';
/**
 * LsCommand - Core Command
 *
 * Lists directory contents.
 * Supports -a (all) and -F (classify).
 *
 * Pillar: The Swift Stream (Performance & Purity)
 * Pillar: The Balanced Scale (SOLID / KISS)
 */

import { CommandBase } from '../CommandBase';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../entities/Command';

import { FileSystemService } from '../../services/FileSystemService';

export class LsCommand extends CommandBase {
    constructor(private fsService: FileSystemService) { super(); }

    executeInternal(args: string[], flags: Set<string>, targets: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const fsService = context.fileSystemService || this.fsService;
        const showHidden = this.hasFlag('a');
        const classify = this.hasFlag('F');
        const recursive = this.hasFlag('R');
        const longFormat = this.hasFlag('l');
        const onePerLine = this.hasFlag('1');

        let exitCode = 0;
        let outputParts: string[] = [];

        const pathsToProcess = targets.length > 0 ? targets : [''];

        // Helper for recursive listing
        const listDirectory = (dirNode: any, dirPath: string, printHeader: boolean) => {
            if (printHeader) {
                outputParts.push(`\n${dirPath}:`);
            }

            if (!dirNode || !dirNode.children) {
                return;
            }

            let files = Array.from(dirNode.children.values() as Iterable<any>);

            if (!showHidden) {
                files = files.filter(f => !f.name.startsWith('.'));
            }

            files.sort((a: any, b: any) => a.name.localeCompare(b.name));

            if (files.length === 0) {
                return;
            }

            const formattedNames = files.map(f => {
                let name = f.name;
                if (classify && fsService.isDirectory(f)) {
                    name += '/';
                }

                if (longFormat) {
                    const isDir = fsService.isDirectory(f);
                    const type = isDir ? 'd' : '-';
                    const perm = 'rw-r--r--';
                    const user = 'operator';
                    const group = 'operator';
                    const stats = fsService.getStat(f);
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
                    if (fsService.isDirectory(f)) {
                        if (f.name === '.' || f.name === '..') continue;

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
            // Logic change: Handle empty string logic for CWD
            const pathToList = targetPath || state.currentDirectory;

            // Resolve using absolute path
            const absPath = targetPath
                ? fsService.resolveAbsolutePath(targetPath, state.currentDirectory)
                : state.currentDirectory;

            const node = fsService.resolve(absPath);

            if (!node) {
                outputParts.push(`ls: cannot access '${targetPath}': No such file or directory`);
                exitCode = 1;
                continue;
            }

            if (!fsService.isDirectory(node)) {
                // It's a file
                if (longFormat) {
                    const type = '-';
                    const perm = 'rw-r--r--';
                    const user = 'operator';
                    const group = 'operator';
                    const stats = fsService.getStat(node);
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
            let printInitialHeader = pathsToProcess.length > 1;
            let displayPath = targetPath;
            if (!displayPath) {
                // If no args, we are listing CWD.
                if (recursive) {
                    displayPath = '.';
                    printInitialHeader = true;
                }
            }

            listDirectory(node, displayPath || pathToList, printInitialHeader);
        }

        let finalOutput = outputParts.join('\n').trim();

        return {
            output: finalOutput,
            newState: state,
            exitCode: exitCode
        };
    }
}
