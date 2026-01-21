/**
 * MkfifoCommand - Core Command
 *
 * Creates named pipes (FIFOs).
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 *
 * Intent:
 * Calls fs.mkfifo to create a special file type.
 */

import { ICommand } from '../ICommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystem } from '../../entities/FileSystem';

export class MkfifoCommand implements ICommand {
    constructor(private fs: FileSystemService) {}

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        const input = context.stdin;
        let mode = 0o644;
        const targets: string[] = [];

        // Parse args
        for (let i = 0; i < args.length; i++) {
            if (args[i] === '-m') {
                if (i + 1 >= args.length) {
                    return { output: 'mkfifo: option requires an argument -- m', newState: state, exitCode: 1 };
                }
                const modeStr = args[i + 1];
                try {
                    mode = parseInt(modeStr, 8);
                    if (isNaN(mode)) throw new Error('Invalid octal');
                } catch (e) {
                     return { output: `mkfifo: invalid mode: '${modeStr}'`, newState: state, exitCode: 1 };
                }
                i++;
            } else if (args[i].startsWith('-')) {
                 return { output: `mkfifo: invalid option -- '${args[i]}'`, newState: state, exitCode: 1 };
            } else {
                targets.push(args[i]);
            }
        }

        if (targets.length === 0) {
            return { output: 'mkfifo: missing operand', newState: state, exitCode: 1 };
        }

        let output = '';
        let finalExitCode = 0;

        for (const target of targets) {
            try {
                this.fs.mkfifo(target, mode, 1000, 1000, state.currentDirectory);
            } catch (error: any) {
                output += `mkfifo: cannot create fifo '${target}': ${error.message}\n`;
                finalExitCode = 1;
            }
        }

        return { output: output.trim(), newState: state, exitCode: finalExitCode };
    }
}
