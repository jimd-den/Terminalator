/**
 * DdCommand - Core Command
 *
 * Convert and copy a file.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 *
 * Intent:
 * Block-level copying.
 */

import { ICommand } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystem } from '../../entities/FileSystem';

export class DdCommand implements ICommand {
    constructor(private fs: FileSystem) { }

    execute(args: string[], state: TerminalState, input?: string): CommandResponse {
        let inFile = '';
        let outFile = '';
        // dd operands: if=file of=file count=n bs=n ...

        for (const arg of args) {
            if (arg.startsWith('if=')) inFile = arg.slice(3);
            else if (arg.startsWith('of=')) outFile = arg.slice(3);
        }

        let content = '';
        if (inFile) {
            try {
                content = this.fs.readFile(this.resolvePath(inFile, state));
            } catch (e) {
                return { output: `dd: failed to open '${inFile}': No such file`, newState: state, exitCode: 1 };
            }
        } else if (input) {
            content = input;
        }

        // Processing (bs, count, skip, seek, conv) skipped for simplified MVP.
        // Identity copy.

        if (outFile) {
            try {
                this.fs.writeFile(this.resolvePath(outFile, state), content, 'w');
            } catch (e) {
                return { output: `dd: failed to write to '${outFile}'`, newState: state, exitCode: 1 };
            }
        } else {
            return { output: content, newState: state, exitCode: 0 };
        }

        // Standard dd outputs stats to stderr.
        // "0+1 records in\n0+1 records out"
        return {
            output: '', // silent to stdout, stats to stderr (not separate here) or output stats?
            newState: state,
            exitCode: 0
        };
    }

    private resolvePath(path: string, state: TerminalState): string {
        if (path.startsWith('/')) return path;
        return state.currentDirectory === '/' ? `/${path}` : `${state.currentDirectory}/${path}`;
    }
}
