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
import { FileSystem } from '../../entities/FileSystem';

export class LsCommand implements ICommand {
    constructor(private fs: FileSystem) {}

    execute(args: string[], state: TerminalState): CommandResponse {
        const flags = args.filter(arg => arg.startsWith('-'));
        const targets = args.filter(arg => !arg.startsWith('-'));

        const showHidden = flags.some(f => f.includes('a'));
        const classify = flags.some(f => f.includes('F'));

        const targetPath = targets.length > 0 ? targets[0] : state.currentDirectory;

        // Resolve path (absolute or relative)
        let resolvedPath = targetPath;
        if (!targetPath.startsWith('/')) {
            resolvedPath = state.currentDirectory === '/'
                ? `/${targetPath}`
                : `${state.currentDirectory}/${targetPath}`;
        }

        const node = this.fs.getNode(resolvedPath);

        if (!node) {
            return {
                output: `ls: cannot access '${targetPath}': No such file or directory`,
                newState: state,
                exitCode: 1 // Standard error code
            };
        }

        if (node.type === 'file') {
            return {
                output: node.name,
                newState: state,
                exitCode: 0
            };
        }

        if (node.type === 'directory' && node.children) {
            let files = Object.values(node.children);

            if (!showHidden) {
                files = files.filter(f => !f.name.startsWith('.'));
            }

            // Sort alphabetically
            files.sort((a, b) => a.name.localeCompare(b.name));

            const formattedNames = files.map(f => {
                let name = f.name;
                if (classify && f.type === 'directory') {
                    name += '/';
                }
                return name;
            });

            return {
                output: formattedNames.join('  '),
                newState: state,
                exitCode: 0
            };
        }

        return {
            output: '',
            newState: state,
            exitCode: 0
        };
    }
}
