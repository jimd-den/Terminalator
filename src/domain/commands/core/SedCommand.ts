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
        // sed -e script -e script file

        let scripts: string[] = [];
        const files: string[] = [];

        // Strip quotes/flags loop
        for (let i = 0; i < args.length; i++) {
            let arg = args[i];

            if (arg === '-e') {
                if (i + 1 < args.length) {
                    scripts.push(args[++i]);
                }
            } else if (arg.startsWith('-')) {
                // other flags ignored
            } else {
                 if (scripts.length === 0) {
                     // First non-flag arg is script if no -e was provided before?
                     // Standard sed: if -e is used, all scripts must be -e?
                     // Or first arg is script if no -e used yet.
                     scripts.push(arg);
                 } else {
                     files.push(arg);
                 }
            }
        }

        if (scripts.length === 0) {
            return { output: 'sed: missing script', newState: state, exitCode: 1 };
        }

        // Combine scripts with newline or semicolon
        const fullScript = scripts.join(';');
        const commands = fullScript.split(';').filter(s => s.trim().length > 0);

        // Prepare processors
        // Processor now takes index (1-based) as well
        const processors: ((line: string, lineNum: number) => string | null)[] = []; // return null to delete line

        for (const cmd of commands) {
            let trimmed = cmd.trim();
            let address = '';

            // Check for numeric address
            const addrMatch = trimmed.match(/^(\d+)(.*)/);
            if (addrMatch) {
                address = addrMatch[1];
                trimmed = addrMatch[2].trim();
            }

            if (trimmed.startsWith('s')) {
                const delimiter = trimmed[1] || '/';
                const parts = trimmed.split(delimiter);
                if (parts.length >= 3) {
                    const pattern = parts[1];
                    const replacement = parts[2];
                    const flags = parts[3] || '';
                    try {
                        const regex = new RegExp(pattern, flags.includes('g') ? 'g' : '');
                        processors.push((line, lineNum) => {
                            if (address && parseInt(address) !== lineNum) return line;
                            return line.replace(regex, replacement);
                        });
                    } catch (e) {
                        return { output: `sed: invalid regex: ${pattern}`, newState: state, exitCode: 1 };
                    }
                }
            } else if (trimmed.startsWith('d')) {
                 processors.push((line, lineNum) => {
                     if (address && parseInt(address) !== lineNum) return line;
                     return null;
                 });
            } else if (trimmed.startsWith('p')) {
                 // p: print (if -n suppressed auto-print)
                 // Implementing proper -n logic is hard without global flag.
                 // assuming default behavior. If 'p' and no -n, duplicates line.
                 // Stub: Ignore for now unless we implement -n
            }
        }

        if (processors.length === 0) {
             // Fallback to original logic if no known commands found
        }

        const applyProcessors = (line: string, lineNum: number): string | null => {
            let current = line;
            for (const p of processors) {
                const res = p(current, lineNum);
                if (res === null) return null;
                current = res;
            }
            return current;
        };

        let output = '';

        // Process Files or Input
        if (files.length === 0) {
            if (input !== undefined) {
                try {
                    const lines = input.split('\n');
                    const resultLines = lines.map((line, idx) => applyProcessors(line, idx + 1)).filter(l => l !== null);
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
                    const resultLines = lines.map((line, idx) => applyProcessors(line, idx + 1)).filter(l => l !== null);

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
