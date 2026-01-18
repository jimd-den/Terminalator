/**
 * StringsCommand - Core Command
 *
 * Find printable strings in files.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 *
 * Intent:
 * Extract human-readable text from binary files.
 */

import { ICommand } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystem } from '../../entities/FileSystem';

export class StringsCommand implements ICommand {
    constructor(private fs: FileSystem) { }

    execute(args: string[], state: TerminalState, input?: string): CommandResponse {
        let minLength = 4;
        const files: string[] = [];

        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            if (arg === '-n') {
                minLength = parseInt(args[++i], 10) || 4;
            } else if (arg.startsWith('-') && !isNaN(parseInt(arg.slice(1)))) {
                // legacy -N
                minLength = parseInt(arg.slice(1), 10);
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
                    return { output: `strings: ${file}: No such file`, newState: state, exitCode: 1 };
                }
            }
        } else if (input) {
            content = input;
        } else {
            // Wait for stdin, or exit
            return { output: '', newState: state, exitCode: 0 };
        }

        const strings: string[] = [];
        let currentString = '';

        for (let i = 0; i < content.length; i++) {
            const charCode = content.charCodeAt(i);
            // Printable ASCII: 32-126, plus tab (9). Newline (10)? Strings usually splits on newline.
            // POSIX: "graphic characters"
            const isPrintable = (charCode >= 32 && charCode <= 126) || charCode === 9;

            if (isPrintable) {
                currentString += content[i];
            } else {
                if (currentString.length >= minLength) {
                    strings.push(currentString);
                }
                currentString = '';
            }
        }
        if (currentString.length >= minLength) {
            strings.push(currentString);
        }

        return {
            output: strings.join('\n'),
            newState: state,
            exitCode: 0
        };
    }

    private resolvePath(path: string, state: TerminalState): string {
        if (path.startsWith('/')) return path;
        return state.currentDirectory === '/' ? `/${path}` : `${state.currentDirectory}/${path}`;
    }
}
