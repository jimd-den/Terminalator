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
        let scripts: string[] = [];
        const files: string[] = [];
        let suppressAutoPrint = false;

        let skipNext = false;
        for (let i = 0; i < args.length; i++) {
            if (skipNext) {
                skipNext = false;
                continue;
            }
            let arg = args[i];

            if (arg === '-e') {
                if (i + 1 < args.length) {
                    scripts.push(args[++i]);
                    skipNext = true;
                }
            } else if (arg === '-n') {
                suppressAutoPrint = true;
            } else if (arg.startsWith('-')) {
                // ignore
            } else {
                 if (scripts.length === 0) {
                     scripts.push(arg);
                 } else {
                     files.push(arg);
                 }
            }
        }

        if (scripts.length === 0) {
            return { output: 'sed: missing script', newState: state, exitCode: 1 };
        }

        const fullScript = scripts.join('\n'); // Join with newline to separate commands
        // Split by semicolon or newline
        const commands = fullScript.split(/[;\n]+/).filter(s => s.trim().length > 0);

        const processors: ((line: string, lineNum: number) => { line: string | null, print: boolean })[] = [];

        for (const cmd of commands) {
            let trimmed = cmd.trim();
            let address = '';

            const addrMatch = trimmed.match(/^(\d+)(.*)/);
            if (addrMatch) {
                address = addrMatch[1];
                trimmed = addrMatch[2].trim();
            }

            if (trimmed.startsWith('s')) {
                const delimiter = trimmed[1] || '/';
                const parts = trimmed.split(delimiter);
                if (parts.length >= 3) {
                    let pattern = parts[1];
                    let replacement = parts[2];
                    const flags = parts[3] || '';

                    // Convert BRE capture groups \( \) to ERE ( )
                    pattern = pattern.replace(/\\\(/g, '(').replace(/\\\)/g, ')');

                    // Convert replacement backreferences \1 to $1
                    replacement = replacement.replace(/\\(\d)/g, '$$$1');
                    replacement = replacement.replace(/&/g, '$$&');

                    try {
                        const regex = new RegExp(pattern, flags.includes('g') ? 'g' : '');
                        processors.push((line, lineNum) => {
                            if (address && parseInt(address) !== lineNum) return { line, print: false };

                            const newLine = line.replace(regex, replacement);
                            const printed = flags.includes('p');
                            return { line: newLine, print: printed };
                        });
                    } catch (e) {
                        return { output: `sed: invalid regex: ${pattern}`, newState: state, exitCode: 1 };
                    }
                }
            } else if (trimmed.startsWith('d')) {
                 processors.push((line, lineNum) => {
                     if (address && parseInt(address) !== lineNum) return { line, print: false };
                     return { line: null, print: false };
                 });
            } else if (trimmed.startsWith('p')) {
                 processors.push((line, lineNum) => {
                     if (address && parseInt(address) !== lineNum) return { line, print: false };
                     return { line, print: true };
                 });
            }
        }

        const processContent = (content: string) => {
            const lines = content.split('\n');
            if (lines.length > 0 && lines[lines.length-1] === '') lines.pop();

            const resultLines: string[] = [];

            lines.forEach((line, idx) => {
                let current = line;
                let deleted = false;
                let extraPrint = false;

                for (const p of processors) {
                    const res = p(current, idx + 1);
                    if (res.line === null) {
                        deleted = true;
                        break;
                    }
                    current = res.line;
                    if (res.print) extraPrint = true;
                }

                if (!deleted) {
                    if (extraPrint) resultLines.push(current);
                    if (!suppressAutoPrint) resultLines.push(current);
                }
            });
            return resultLines.join('\n');
        };

        let output = '';
        if (files.length === 0) {
            if (input !== undefined) {
                output = processContent(input);
            } else {
                return { output: '', newState: state, exitCode: 0 };
            }
        } else {
            for (const filename of files) {
                let path = filename;
                if (!path.startsWith('/')) {
                    path = state.currentDirectory === '/' ? `/${filename}` : `${state.currentDirectory}/${filename}`;
                }
                try {
                    const content = this.fs.readFile(path);
                    output += processContent(content);
                    output += '\n';
                } catch (e: any) {
                    return { output: `sed: cannot read ${filename}: ${e.message}`, newState: state, exitCode: 1 };
                }
            }
            if (output.endsWith('\n')) output = output.slice(0, -1);
        }

        return {
            output: output,
            newState: state,
            exitCode: 0
        };
    }
}
