/**
 * NlCommand - Core Command
 *
 * Number lines of files.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 *
 * Intent:
 * Line numbering filter.
 */

import { ICommand } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystem } from '../../entities/FileSystem';

export class NlCommand implements ICommand {
    constructor(private fs: FileSystem) { }

    execute(args: string[], state: TerminalState, input?: string): CommandResponse {
        let bodyType = 't'; // t=non-empty, a=all, n=none
        const files: string[] = [];

        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            if (arg === '-b') {
                bodyType = args[++i] || 't';
            } else if (!arg.startsWith('-')) {
                files.push(arg);
            }
        }

        let content = '';
        if (files.length > 0) {
            for (const file of files) {
                try {
                    content += this.fs.readFile(this.resolvePath(file, state));
                } catch (e) {
                    return { output: `nl: ${file}: No such file`, newState: state, exitCode: 1 };
                }
            }
        } else if (input) {
            content = input;
        } else {
            return { output: '', newState: state, exitCode: 0 };
        }

        const lines = content.split('\n');
        const outputLines: string[] = [];
        let lineNum = 1;

        for (const line of lines) {
            let numberIt = false;
            if (bodyType === 'a') numberIt = true;
            else if (bodyType === 't' && line.trim() !== '') numberIt = true;
            else if (bodyType === 'n') numberIt = false;

            if (numberIt) {
                // POSIX default format is 6 chars wide, right justified?
                // Simplified: "   1  line"
                const numStr = lineNum.toString().padStart(6, ' ');
                outputLines.push(`${numStr}  ${line}`);
                lineNum++;
            } else {
                outputLines.push(line); // Just print empty line
            }
        }

        return {
            output: outputLines.join('\n'),
            newState: state,
            exitCode: 0
        };
    }

    private resolvePath(path: string, state: TerminalState): string {
        if (path.startsWith('/')) return path;
        return state.currentDirectory === '/' ? `/${path}` : `${state.currentDirectory}/${path}`;
    }
}
