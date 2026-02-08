import { getStdinAsString } from '../../entities/ProcessContext';
/**
 * UniqCommand - Core Command
 *
 * Report or omit repeated lines.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 *
 * Intent:
 * Filters adjacent matching lines from input.
 * Refactored to implement IStructuredCommand for combinatorial scaling.
 */

import { CommandBase } from '../CommandBase';
import { CommandCapability } from '../IStructuredCommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../entities/Command';

import { FileSystemService } from '../../services/FileSystemService';

interface UniqOptions {
    count: boolean;
    repeated: boolean;
    unique: boolean;
    skipFields: number;
    skipChars: number;
    ignoreCase: boolean;
    inputFile?: string;
    outputFile?: string;
}

export class UniqCommand extends CommandBase {
    public readonly capabilities = [CommandCapability.FILTER];
    public readonly utility = 'uniq';

    constructor(private fs: FileSystemService) { 
        super();
    }

    protected override parseArgs(args: string[]) {
        // uniq options that take arguments: -f, -s
        super.parseArgs(args, ['f', 's']);
    }

    protected async executeInternal(
        rawArgs: string[],
        flags: Set<string>,
        operands: string[],
        context: ProcessContext,
        state: TerminalState
    ): Promise<CommandResponse> {
        const input = getStdinAsString(context);
        const options: UniqOptions = {
            count: flags.has('c'),
            repeated: flags.has('d'),
            unique: flags.has('u'),
            ignoreCase: flags.has('i'),
            skipFields: this.options.get('f') ? parseInt(this.options.get('f')!) : 0,
            skipChars: this.options.get('s') ? parseInt(this.options.get('s')!) : 0
        };

        if (operands.length > 0) options.inputFile = operands[0];
        if (operands.length > 1) options.outputFile = operands[1];

        let content = '';
        if (options.inputFile && options.inputFile !== '-') {
            try {
                const resolvedPath = this.resolvePath(options.inputFile, state);
                content = this.fs.readFile(resolvedPath);
            } catch (e) {
                return {
                    output: `uniq: ${options.inputFile}: No such file or directory`,
                    newState: state,
                    exitCode: 1
                };
            }
        } else if (input !== undefined) {
            content = input;
        } else {
            return { output: '', newState: state, exitCode: 0 };
        }

        const lines = content.split('\n');
        if (content.endsWith('\n') && lines[lines.length - 1] === '') {
            lines.pop();
        }

        const results: string[] = [];
        let previousLine: string | null = null;
        let count = 0;

        const getCompareKey = (line: string): string => {
            let key = line;
            if (options.skipFields > 0) {
                let remaining = line;
                for (let f = 0; f < options.skipFields; f++) {
                    remaining = remaining.trimStart();
                    const spaceIdx = remaining.search(/\s/);
                    if (spaceIdx === -1) {
                        remaining = "";
                        break;
                    }
                    remaining = remaining.substring(spaceIdx);
                }
                key = remaining.trimStart();
            }

            if (options.skipChars > 0) {
                if (key.length > options.skipChars) {
                    key = key.substring(options.skipChars);
                } else {
                    key = "";
                }
            }

            if (options.ignoreCase) {
                key = key.toLowerCase();
            }
            return key;
        };

        const flush = () => {
            if (previousLine !== null) {
                const isRepeated = count > 1;
                let shouldPrint = true;

                if (options.repeated || options.unique) {
                    shouldPrint = false;
                    if (options.repeated && isRepeated) shouldPrint = true;
                    if (options.unique && !isRepeated) shouldPrint = true;
                }

                if (shouldPrint) {
                    let lineOut = previousLine;
                    if (options.count) {
                        lineOut = `${count.toString().padStart(4)} ${lineOut}`;
                    }
                    results.push(lineOut);
                }
            }
        };

        for (const line of lines) {
            const key = getCompareKey(line);

            if (previousLine === null) {
                previousLine = line;
                count = 1;
                continue;
            }

            const prevKey = getCompareKey(previousLine);

            if (key !== prevKey) {
                flush();
                previousLine = line;
                count = 1;
            } else {
                count++;
            }
        }
        flush();

        const finalOutput = results.join('\n');

        if (options.outputFile) {
            try {
                const resolvedOut = this.resolvePath(options.outputFile, state);
                this.fs.writeFile(resolvedOut, finalOutput);
                return { output: '', newState: state, exitCode: 0 };
            } catch (e) {
                return { output: `uniq: ${options.outputFile}: Cannot write`, newState: state, exitCode: 1 };
            }
        }

        return {
            output: finalOutput,
            newState: state,
            exitCode: 0
        };
    }

    private resolvePath(path: string, state: TerminalState): string {
        if (path.startsWith('/')) return path;
        return state.currentDirectory === '/' ? `/${path}` : `${state.currentDirectory}/${path}`;
    }
}