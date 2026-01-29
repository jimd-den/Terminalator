import { getStdinAsString } from '../../entities/ProcessContext';
/**
 * SleepCommand - Core Command
 *
 * Suspend execution for an interval.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 *
 * Intent:
 * Pause execution.
 */

import { ICommand } from '../ICommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../entities/Command';

import { FileSystem } from '../../entities/FileSystem';

export class SleepCommand implements ICommand {
    constructor(private fs: FileSystemService) { }

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        const input = getStdinAsString(context);
        if (args.length === 0) {
            return { output: 'sleep: missing operand', newState: state, exitCode: 1 };
        }

        const seconds = parseFloat(args[0]);
        if (isNaN(seconds)) {
            return { output: `sleep: invalid time interval '${args[0]}'`, newState: state, exitCode: 1 };
        }

        // Wait
        await new Promise(resolve => setTimeout(resolve, seconds * 1000));

        return {
            output: '',
            newState: state,
            exitCode: 0
        };
    }
}
