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
    constructor(private fs: FileSystem) { }

    execute(args: string[], state: TerminalState, input?: string): CommandResponse {
        const flags = args.filter(arg => arg.startsWith('-'));
        const targets = args.filter(arg => !arg.startsWith('-'));

        const showHidden = flags.some(f => f.includes('a'));
        const classify = flags.some(f => f.includes('F'));

        const targetPath = targets.length > 0 ? targets[0] : '';
        // If targetPath is empty, resolveNode(cwd) effectively lists cwd if we pass it as absolute, or we handle it.
        // Better:
        const pathToList = targetPath || state.currentDirectory;

        const node = this.fs.resolveNode(pathToList, state.currentDirectory);

        if (!node) {
            return {
                output: `ls: cannot access '${targetPath || '.'}': No such file or directory`,
                newState: state,
                exitCode: 1
            };
        }

        if (!this.fs.isDirectory(node)) {
            return {
                output: node.name,
                newState: state,
                exitCode: 0
            };
        }

        // Is directory
        let files = Array.from(node.children.values());

        if (!showHidden) {
            files = files.filter(f => !f.name.startsWith('.'));
        }

        files.sort((a, b) => a.name.localeCompare(b.name));

        const formattedNames = files.map(f => {
            let name = f.name;
            if (classify && this.fs.isDirectory(f)) {
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
}
