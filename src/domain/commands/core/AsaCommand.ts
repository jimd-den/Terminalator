/**
 * AsaCommand - Core Command
 *
 * Interpret carriage-control characters.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 *
 * Intent:
 * Fortran-style printing control.
 */

import { ICommand } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystem } from '../../entities/FileSystem';

export class AsaCommand implements ICommand {
    constructor(private fs: FileSystem) { }

    execute(args: string[], state: TerminalState, input?: string): CommandResponse {
        const files = args.filter(a => !a.startsWith('-'));
        let content = '';

        if (files.length > 0) {
            for (const file of files) {
                try {
                    content += this.fs.readFile(this.resolvePath(file, state));
                } catch (e) {
                    return { output: `asa: ${file}: No such file`, newState: state, exitCode: 1 };
                }
            }
        } else if (input) {
            content = input;
        } else {
            return { output: '', newState: state, exitCode: 0 };
        }

        const lines = content.split('\n');
        let output = '';

        for (const line of lines) {
            if (line.length === 0) {
                output += '\n';
                continue;
            }
            const control = line[0];
            const data = line.slice(1);

            switch (control) {
                case '0':
                    output += '\n\n' + data;
                    break;
                case '1':
                    output += '\f' + data; // Form feed
                    break;
                case '+':
                    // Overprint. In a terminal, usually just print with \r?
                    // Or ignore previous newline?
                    // Simplified: append \r + data?
                    output += '\r' + data;
                    break;
                case ' ':
                default:
                    output += '\n' + (control === ' ' ? data : line);
                    break;
            }
        }
        // Asa usually converts first char. If not valid control, treated as space?
        // "If the first character ... is not ..., the action is unspecified."
        // We trim initial newline if output started with it?
        // Logic: control action happens BEFORE printing.
        // Default is \n.
        // So '0' is \n\n.
        // If output starts with \n, it's fine.

        return {
            output: output.trimStart(), // Adjust logic?
            newState: state,
            exitCode: 0
        };
    }

    private resolvePath(path: string, state: TerminalState): string {
        if (path.startsWith('/')) return path;
        return state.currentDirectory === '/' ? `/${path}` : `${state.currentDirectory}/${path}`;
    }
}
