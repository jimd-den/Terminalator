/**
 * AwkCommand - Core Command
 *
 * Pattern scanning and processing language.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 * Pillar: The Storyteller’s Code (Literate Documentation)
 *
 * Intent:
 * Allows the operator to process text columns (simple implementation).
 */

import { ICommand } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystem } from '../../entities/FileSystem';

export class AwkCommand implements ICommand {
    constructor(private fs: FileSystem) { }

    execute(args: string[], state: TerminalState, input?: string): CommandResponse {
        // Syntax: awk 'program' [file]
        // Example: awk '{print $2}' file.txt

        let program = '';
        let file = '';

        if (args.length > 0) {
            program = args[0];
            // ShellParser handles quote removal
        }

        if (args.length > 1) {
            file = args[1];
        }

        let content = '';
        if (file) {
            // Read from file
            let path = file;
            if (!path.startsWith('/')) {
                path = state.currentDirectory === '/'
                    ? `/${file}`
                    : `${state.currentDirectory}/${file}`;
            }
            try {
                content = this.fs.readFile(path);
            } catch (e: any) {
                return { output: `awk: cannot open ${file}: ${e.message}`, newState: state, exitCode: 1 };
            }
        } else if (input !== undefined) {
            // Read from stdin
            content = input;
        } else {
            return { output: 'awk: no input', newState: state, exitCode: 1 };
        }

        // Very basic parser: strictly support '{print $N}' or '{print}'
        // Remove braces
        const body = program.trim();
        if (!body.startsWith('{') || !body.endsWith('}')) {
            return { output: `awk: invalid program: ${program}`, newState: state, exitCode: 1 };
        }

        const action = body.substring(1, body.length - 1).trim(); // "print $2"

        const lines = content.split('\n');
        const outputLines: string[] = [];

        for (const line of lines) {
            if (!line) continue; // Skip empty lines or handle? standard awk processes them.
            // Split by whitespace
            const columns = line.trim().split(/\s+/);
            // $0 is whole line
            // $1 is first col

        // Variables: NF (Number of Fields), NR (Number of Records)
        const NF = columns.length;
        const NR = outputLines.length + 1; // 1-based line number (assuming we output one per input line)

            if (action === 'print') {
                outputLines.push(line);
        } else if (action.startsWith('print ')) {
            const expr = action.substring(6).trim();
            if (expr.startsWith('$')) {
                const colIndexStr = expr.substring(1); // "2"
                const colIndex = parseInt(colIndexStr);
                if (!isNaN(colIndex)) {
                     if (colIndex === 0) outputLines.push(line);
                     else if (colIndex > 0 && colIndex <= columns.length) outputLines.push(columns[colIndex - 1]);
                     else outputLines.push('');
                    } else {
                    outputLines.push(line); // fallback
                    }
            } else if (expr === 'NF') {
                outputLines.push(NF.toString());
            } else if (expr === 'NR') {
                outputLines.push(NR.toString());
            } else {
                // Simple literal or unknown
                outputLines.push(expr); // e.g. print "hello" -> prints "hello" (quotes handled by shell parser?)
                // If shell parser removed quotes, we get hello.
                }
            } else {
             // Implicit print if pattern matches?
             // Minimal stub:
             return { output: `awk: unsupported action: ${action}`, newState: state, exitCode: 1 };
            }
        }

        return {
            output: outputLines.join('\n'),
            newState: state,
            exitCode: 0
        };
    }
}
