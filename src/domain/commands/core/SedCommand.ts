/**
 * SedCommand - Core Command
 *
 * Stream Editor for filtering and transforming text.
 * 
 * Pillar: The Four-Fold Shield (Strict Architecture) - Use Cases/Command
 * Pillar: The Balanced Scale (SOLID / KISS) - Delegating to SedEngine
 * Pillar: The Storyteller’s Code (Literate Documentation)
 *
 * Intent:
 * Provides a POSIX-compliant entry point for the sed utility.
 * It handles argument parsing, file I/O, and delegates the core
 * streaming logic to the SedEngine VM.
 */

import { ICommand } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystemService } from '../../services/FileSystemService';
import { SedParser, SedVM, SedState } from '../../services/SedEngine';

export class SedCommand implements ICommand {
    constructor(private fs: FileSystemService) { }

    execute(args: string[], state: TerminalState, input?: string): CommandResponse {
        const scripts: string[] = [];
        const files: string[] = [];
        let suppressAutoPrint = false;
        let ereMode = false;
        let inPlace = false;

        // Parse options
        let i = 0;
        while (i < args.length) {
            const arg = args[i];
            if (arg === '-e') {
                if (++i < args.length) scripts.push(args[i]);
            } else if (arg === '-f') {
                if (++i < args.length) {
                    try {
                        scripts.push(this.fs.readFile(this.resolvePath(args[i], state)));
                    } catch (e) {
                        return { output: `sed: cannot read script file ${args[i]}`, newState: state, exitCode: 1 };
                    }
                }
            } else if (arg === '-n') {
                suppressAutoPrint = true;
            } else if (arg === '-E') {
                ereMode = true;
            } else if (arg === '-i') {
                inPlace = true;
            } else if (arg.startsWith('-')) {
                // Ignore unknown options or group them
                if (arg.includes('n')) suppressAutoPrint = true;
                if (arg.includes('E')) ereMode = true;
                if (arg.includes('i')) inPlace = true;
            } else {
                if (scripts.length === 0) {
                    scripts.push(arg);
                } else {
                    files.push(arg);
                }
            }
            i++;
        }

        if (scripts.length === 0) {
            return { output: 'sed: missing script', newState: state, exitCode: 1 };
        }

        let instructions;
        try {
            instructions = SedParser.parse(scripts.join('\n'), ereMode);
        } catch (e: any) {
            return { output: `sed: ${e.message}`, newState: state, exitCode: 1 };
        }

        const processContent = (content: string) => {
            const lines = content.split('\n');
            // Remove trailing empty line if it resulted from a trailing newline
            const hasTrailingNewline = content.endsWith('\n');
            if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();

            let sedState: SedState = {
                patternSpace: '',
                holdSpace: '',
                lineNumber: 0,
                isLastLine: false,
                deleted: false,
                printed: [],
                nextCycle: false,
                quit: false,
                substSuccess: false,
                rangeActive: [],
                rangeEnding: [],
                insertBuffer: [],
                appendBuffer: [],
                lines: lines,
                currentIndex: 0,
                suppressAutoPrint: suppressAutoPrint
            };

            const resultLines: string[] = [];

            for (let j = 0; j < lines.length; j++) {
                sedState.currentIndex = j;
                sedState.patternSpace = lines[j];
                sedState.lineNumber = j + 1;
                sedState.isLastLine = (j === lines.length - 1);
                sedState.substSuccess = false;
                sedState.printed = [];

                sedState = SedVM.execute(instructions, sedState);

                // 1. Inserted/Changed lines
                for (const il of sedState.insertBuffer) {
                    resultLines.push(il);
                }

                // 2. Explicitly printed lines during script execution (p, =, etc)
                for (const pl of sedState.printed) {
                    resultLines.push(pl);
                }

                if (!sedState.deleted) {
                    // 3. Default behavior: print final pattern space if not suppressed
                    if (!suppressAutoPrint) resultLines.push(sedState.patternSpace);
                }

                // 4. Appended lines
                for (const al of sedState.appendBuffer) {
                    resultLines.push(al);
                }

                // Sync index back from VM (for n/N commands)
                j = sedState.currentIndex;

                if (sedState.quit) break;
            }

            let result = resultLines.join('\n');
            if (result.length > 0 || hasTrailingNewline) result += '\n';
            return result;
        };

        if (files.length === 0) {
            if (input !== undefined) {
                return { output: processContent(input), newState: state, exitCode: 0 };
            }
            return { output: '', newState: state, exitCode: 0 };
        }

        let totalOutput = '';
        for (const filename of files) {
            const path = this.resolvePath(filename, state);
            try {
                const content = this.fs.readFile(path);
                const result = processContent(content);
                if (inPlace) {
                    this.fs.writeFile(path, result, 'w');
                } else {
                    totalOutput += result;
                }
            } catch (e: any) {
                return { output: `sed: ${filename}: ${e.message}`, newState: state, exitCode: 1 };
            }
        }

        return {
            output: totalOutput,
            newState: state,
            exitCode: 0
        };
    }

    private resolvePath(filename: string, state: TerminalState): string {
        if (filename.startsWith('/')) return filename;
        return state.currentDirectory === '/' ? `/${filename}` : `${state.currentDirectory}/${filename}`;
    }
}
