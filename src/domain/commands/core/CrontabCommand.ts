import { getStdinAsString } from '../../entities/ProcessContext';
/**
 * CrontabCommand - Core Command
 *
 * User crontab file.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 *
 * Intent:
 * Job scheduling (mock).
 */

import { ICommand } from '../ICommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../entities/Command';

import { FileSystem } from '../../entities/FileSystem';

export class CrontabCommand implements ICommand {
    constructor(private fs: FileSystemService) { }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const input = getStdinAsString(context);
        const user = state.user || 'operator';
        if (args.includes('-l')) {
            return { output: `no crontab for ${user}`, newState: state, exitCode: 1 };
        }
        return {
            output: '',
            newState: state,
            exitCode: 0
        };
    }
}
