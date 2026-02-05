import { getStdinAsString } from '../../entities/ProcessContext';
/**
 * SortCommand - Core Command
 *
 * Sort lines of text files.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 *
 * Intent:
 * Sorts input lines.
 * Refactored to implement IStructuredCommand for combinatorial scaling.
 */

import { CommandBase } from '../CommandBase';
import { CommandCapability } from '../IStructuredCommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../entities/Command';

import { FileSystemService } from '../../services/FileSystemService';

interface SortOptions {
    reverse: boolean;
    numeric: boolean;
    unique: boolean;
    check: boolean;
    key?: number;
    outputFile?: string;
    files: string[];
}

export class SortCommand extends CommandBase {
    public readonly capabilities = [CommandCapability.TRANSFORM];
    public readonly utility = 'sort';

    constructor(private fs: FileSystemService) { 
        super();
    }

    protected override parseArgs(args: string[]) {
        // sort options that take arguments: -o, -k
        super.parseArgs(args, ['o', 'k']);
    }

    protected async executeInternal(
        rawArgs: string[],
        flags: Set<string>,
        operands: string[],
        context: ProcessContext,
        state: TerminalState
    ): Promise<CommandResponse> {
        const input = getStdinAsString(context);
        const options: SortOptions = {
            reverse: flags.has('r'),
            numeric: flags.has('n'),
            unique: flags.has('u'),
            check: flags.has('c'),
            outputFile: this.options.get('o'),
            key: this.options.get('k') ? parseInt(this.options.get('k')!) : undefined,
            files: operands
        };

        let content = '';
        if (options.files.length > 0) {
            for (const file of options.files) {
                if (file === '-') {
                    content += (input || '') + '\n';
                    continue;
                }
                try {
                    const resolvedPath = this.resolvePath(file, state);
                    content += this.fs.readFile(resolvedPath) + '\n';
                } catch (e) {
                    return {
                        output: `sort: ${file}: No such file or directory`,
                        newState: state,
                        exitCode: 1
                    };
                }
            }
            if (content.endsWith('\n')) content = content.slice(0, -1);
        } else if (input !== undefined) {
            content = input;
        } else {
            return { output: '', newState: state, exitCode: 0 };
        }

        let lines = content.split('\n');
        if (content.endsWith('\n') && lines[lines.length - 1] === '') {
            lines.pop();
        }

        if (options.unique) {
            lines = Array.from(new Set(lines));
        }

        const compare = (a: string, b: string) => {
            let valA = a;
            let valB = b;

            if (options.key) {
                const partsA = a.trim().split(/\s+/);
                const partsB = b.trim().split(/\s+/);
                valA = partsA[options.key - 1] || '';
                valB = partsB[options.key - 1] || '';
            }

            let res = 0;
            if (options.numeric) {
                const numA = parseFloat(valA);
                const numB = parseFloat(valB);
                if (!isNaN(numA) && !isNaN(numB)) {
                    res = numA - numB;
                } else {
                    res = valA.localeCompare(valB);
                }
            } else {
                res = valA.localeCompare(valB);
            }
            return options.reverse ? -res : res;
        };

        if (options.check) {
            for (let i = 0; i < lines.length - 1; i++) {
                if (compare(lines[i], lines[i + 1]) > 0) {
                    return {
                        output: `sort: disorder: ${lines[i + 1]}`,
                        newState: state,
                        exitCode: 1
                    };
                }
            }
            return { output: '', newState: state, exitCode: 0 };
        }

        lines.sort(compare);

        const result = lines.join('\n');

        if (options.outputFile) {
            try {
                const resolvedOut = this.resolvePath(options.outputFile, state);
                this.fs.writeFile(resolvedOut, result);
                return { output: '', newState: state, exitCode: 0 };
            } catch (e) {
                return { output: `sort: ${options.outputFile}: Cannot write`, newState: state, exitCode: 1 };
            }
        }

        return {
            output: result,
            newState: state,
            exitCode: 0
        };
    }

    private resolvePath(path: string, state: TerminalState): string {
        if (path.startsWith('/')) return path;
        return state.currentDirectory === '/' ? `/${path}` : `${state.currentDirectory}/${path}`;
    }
}