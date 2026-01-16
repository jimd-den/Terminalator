/**
 * CatCommand - Core Command
 *
 * Concatenates and displays file content.
 *
 * Pillar: The Swift Stream (Performance & Purity)
 * Pillar: The Balanced Scale (SOLID / KISS)
 * Pillar: The Storyteller’s Code (Literate Documentation)
 *
 * Intent:
 * The primary way to read information from files (emails, logs, configs).
 */

import { ICommand } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystem } from '../../entities/FileSystem';

export class CatCommand implements ICommand {
    constructor(private fs: FileSystem) {}

    execute(args: string[], state: TerminalState): CommandResponse {
        if (args.length === 0) {
            return {
                output: 'usage: cat <filename>',
                newState: state,
                exitCode: 1
            };
        }

        const filename = args[0];
        const path = state.currentDirectory === '/' ? `/${filename}` : `${state.currentDirectory}/${filename}`;

        // Basic resolution (no complex paths for cat yet in this iteration, keeping it simple as per KISS)
        const node = this.fs.getNode(path);

        if (node && node.type === 'file') {
            return {
                output: node.content || '',
                newState: state,
                exitCode: 0
            };
        }

        return {
            output: `cat: ${filename}: No such file or directory`,
            newState: state,
            exitCode: 1
        };
    }
}
