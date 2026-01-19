/**
 * ExpandCommand - Core Command
 *
 * Convert tabs to spaces.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 *
 * Intent:
 * Tab expansion.
 */

import { ICommand } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystem } from '../../entities/FileSystem';

export class ExpandCommand implements ICommand {
    constructor(private fs: FileSystem) { }

    execute(args: string[], state: TerminalState, input?: string): CommandResponse {
        let tabStop = 8;
        const files: string[] = [];

        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            if (arg === '-t') {
                tabStop = parseInt(args[++i], 10) || 8;
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
                    return { output: `expand: ${file}: No such file`, newState: state, exitCode: 1 };
                }
            }
        } else if (input) {
            content = input;
        } else {
            return { output: '', newState: state, exitCode: 0 };
        }

        const lines = content.split('\n');
        const output: string[] = [];

        for (const line of lines) {
            let expanded = '';
            for (let i = 0; i < line.length; i++) {
                if (line[i] === '\t') {
                    const currentPos = expanded.length;
                    const spaces = tabStop - (currentPos % tabStop);
                    expanded += ' '.repeat(spaces);
                } else {
                    expanded += line[i];
                }
            }
            output.push(expanded);
        }

        return {
            output: output.join('\n'),
            newState: state,
            exitCode: 0
        };
    }

    private resolvePath(path: string, state: TerminalState): string {
        if (path.startsWith('/')) return path;
        return state.currentDirectory === '/' ? `/${path}` : `${state.currentDirectory}/${path}`;
    }
}
