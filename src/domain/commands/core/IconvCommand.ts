/**
 * IconvCommand - Core Command
 *
 * Codeset conversion.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 *
 * Intent:
 * Convert text encoding.
 */

import { ICommand } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystem } from '../../entities/FileSystem';

export class IconvCommand implements ICommand {
    constructor(private fs: FileSystem) { }

    execute(args: string[], state: TerminalState, input?: string): CommandResponse {
        // iconv [-f from] [-t to] [file]
        const files: string[] = [];
        for (const arg of args) {
            if (!arg.startsWith('-') && !arg.includes('UTF') && !arg.includes('ASCII')) { // heuristics for args
                files.push(arg);
            }
        }

        let content = '';
        if (files.length > 0) {
            try {
                content = this.fs.readFile(this.resolvePath(files[0], state));
            } catch (e) {
                return { output: `iconv: ${files[0]}: No such file`, newState: state, exitCode: 1 };
            }
        } else if (input) {
            content = input;
        }

        // Identity conversion for simulation
        // Real logic needs buffer encoding support.

        return {
            output: content,
            newState: state,
            exitCode: 0
        };
    }

    private resolvePath(path: string, state: TerminalState): string {
        if (path.startsWith('/')) return path;
        return state.currentDirectory === '/' ? `/${path}` : `${state.currentDirectory}/${path}`;
    }
}
