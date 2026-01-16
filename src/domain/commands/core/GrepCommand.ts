/**
 * GrepCommand - Core Command
 *
 * Searches for patterns in files.
 *
 * Pillar: The Swift Stream (Performance & Purity)
 * Pillar: The Balanced Scale (SOLID / KISS)
 * Pillar: The Storyteller’s Code (Literate Documentation)
 *
 * Intent:
 * Allows the operator to filter information and find specific data points.
 */

import { ICommand } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystem } from '../../entities/FileSystem';

export class GrepCommand implements ICommand {
    constructor(private fs: FileSystem) {}

    execute(args: string[], state: TerminalState): CommandResponse {
        if (args.length < 2) {
            return {
                output: 'usage: grep <pattern> <filename>',
                newState: state,
                exitCode: 2
            };
        }

        const pattern = args[0];
        const filename = args[1];
        const path = state.currentDirectory === '/' ? `/${filename}` : `${state.currentDirectory}/${filename}`;

        const node = this.fs.getNode(path);

        if (!node || node.type !== 'file') {
            return {
                output: `grep: ${filename}: No such file or directory`,
                newState: state,
                exitCode: 2
            };
        }

        const content = node.content || '';
        const lines = content.split('\n');
        const matches = lines.filter(line => line.includes(pattern));

        if (matches.length > 0) {
            return {
                output: matches.join('\n'),
                newState: state,
                exitCode: 0
            };
        }

        return {
            output: '',
            newState: state,
            exitCode: 1 // POSIX grep returns 1 if no lines selected
        };
    }
}
