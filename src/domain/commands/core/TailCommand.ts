/**
 * TailCommand - Core Command
 *
 * Output the last part of files.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 * Pillar: The Storyteller’s Code (Literate Documentation)
 *
 * Intent:
 * Allows the operator to view the end of files.
 */

import { ICommand } from '../ICommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystemService } from '../../services/FileSystemService';

export class TailCommand implements ICommand {
    constructor(private fs: FileSystemService) { }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const input = context.stdin;
        let linesToPrint = 10;
        let bytesToPrint = -1;

        const targets: string[] = [];
        let skipNext = false;

        for (let i = 0; i < args.length; i++) {
            if (skipNext) {
                skipNext = false;
                continue;
            }

            const arg = args[i];
            if (arg === '-n') {
                if (i + 1 < args.length) {
                    linesToPrint = parseInt(args[i + 1]);
                    skipNext = true;
                } else {
                    return { output: 'tail: option requires an argument -- n', newState: state, exitCode: 1 };
                }
            } else if (arg === '-c') {
                if (i + 1 < args.length) {
                    bytesToPrint = parseInt(args[i + 1]);
                    skipNext = true;
                } else {
                    return { output: 'tail: option requires an argument -- c', newState: state, exitCode: 1 };
                }
            } else if (arg.startsWith('-') && arg !== '-') {
                // ignore other flags
            } else {
                targets.push(arg);
            }
        }

        const getTail = (content: string): string => {
            if (bytesToPrint !== -1) {
                return content.slice(-bytesToPrint);
            }

            const lines = content.split('\n');
            let effectiveLines = lines;
            let hasTrailing = false;
            if (lines.length > 0 && lines[lines.length - 1] === '') {
                effectiveLines = lines.slice(0, -1);
                hasTrailing = true;
            }

            const snippet = effectiveLines.slice(-linesToPrint);
            let output = snippet.join('\n');
            if (hasTrailing && snippet.length > 0) {
                output += '\n';
            }
            return output;
        };

        if (targets.length === 0 || (targets.length === 1 && targets[0] === '-')) {
            if (input !== undefined) {
                return { output: getTail(input), newState: state, exitCode: 0 };
            } else {
                return { output: '', newState: state, exitCode: 0 };
            }
        }

        let output = '';
        let exitCode = 0;

        for (let i = 0; i < targets.length; i++) {
            const filename = targets[i];

            if (targets.length > 1) {
                if (i > 0) output += '\n';
                output += `==> ${filename} <==\n`;
            }

            let path = filename;
            if (!path.startsWith('/')) {
                path = state.currentDirectory === '/' ? `/${filename}` : `${state.currentDirectory}/${filename}`;
            }

            try {
                const content = this.fs.readFile(path);
                output += getTail(content);
            } catch (error: any) {
                output += `tail: cannot open '${filename}' for reading: No such file or directory`;
                exitCode = 1;
            }
        }

        return {
            output: output,
            newState: state,
            exitCode: exitCode
        };
    }
}
