/**
 * SedCommand - Core Command
 *
 * Stream Editor for filtering and transforming text.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 * Pillar: The Storyteller’s Code (Literate Documentation)
 *
 * Intent:
 * Allows the operator to modify text streams using regex.
 */

import { ICommand } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystem } from '../../entities/FileSystem';

export class SedCommand implements ICommand {
    constructor(private fs: FileSystem) { }

    execute(args: string[], state: TerminalState, input?: string): CommandResponse {
        // Simple parser:
        // sed [script] [file...]
        // sed -e [script] [file...]

        let script = '';
        const files: string[] = [];

        // Strip quotes/flags loop
        for (let i = 0; i < args.length; i++) {
            let arg = args[i];

            // Strip quotes
            if ((arg.startsWith('"') && arg.endsWith('"')) ||
                (arg.startsWith("'") && arg.endsWith("'"))) {
                arg = arg.substring(1, arg.length - 1);
            }

            if (arg === '-e') {
                if (i + 1 < args.length) {
                    script = args[++i];
                    // Strip quotes again just in case handling
                    if ((script.startsWith('"') && script.endsWith('"')) ||
                        (script.startsWith("'") && script.endsWith("'"))) {
                        script = script.substring(1, script.length - 1);
                    }
                }
            } else if (!script) {
                // First non-flag arg is script
                script = arg;
            } else {
                files.push(arg);
            }
        }

        if (!script) {
            return { output: 'sed: missing script', newState: state, exitCode: 1 };
        }

        // Parse Script s/regex/replacement/flags
        // Only support 's' command for now
        if (!script.startsWith('s')) {
            return { output: 'sed: only substitution (s) supported', newState: state, exitCode: 1 };
        }

        const delimiter = script[1]; // usually /
        const parts = script.split(delimiter);
        // s/regex/repl/flags -> [s, regex, repl, flags]
        // valid length >= 3 (flags optional)

        if (parts.length < 3) {
            return { output: `sed: bad option in substitution expression`, newState: state, exitCode: 1 };
        }

        const pattern = parts[1];
        const replacement = parts[2];
        const flags = parts[3] || '';

        let regex: RegExp;
        try {
            regex = new RegExp(pattern, flags.includes('g') ? 'g' : '');
        } catch (e) {
            return { output: `sed: invalid regex: ${pattern}`, newState: state, exitCode: 1 };
        }

        let output = '';

        // Process Files or Input
        if (files.length === 0) {
            if (input !== undefined) {
                try {
                    const lines = input.split('\n');
                    const resultLines = lines.map(line => {
                        return line.replace(regex, replacement);
                    });
                    output += resultLines.join('\n');
                } catch (e: any) {
                    return { output: `sed: error processing input: ${e.message}`, newState: state, exitCode: 1 };
                }
            } else {
                return { output: 'sed: missing input file (stdin not implemented)', newState: state, exitCode: 1 };
            }
        } else {
            for (const filename of files) {
                let path = filename;
                if (!path.startsWith('/')) {
                    path = state.currentDirectory === '/'
                        ? `/${filename}`
                        : `${state.currentDirectory}/${filename}`;
                }

                try {
                    const content = this.fs.readFile(path);
                    const lines = content.split('\n');
                    const resultLines = lines.map(line => {
                        return line.replace(regex, replacement);
                    });

                    output += resultLines.join('\n');
                } catch (e: any) {
                    return { output: `sed: cannot read ${filename}: ${e.message}`, newState: state, exitCode: 1 };
                }
            }
        }

        return {
            output: output,
            newState: state,
            exitCode: 0
        };
    }
}
