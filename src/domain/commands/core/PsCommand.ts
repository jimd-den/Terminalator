import { getStdinAsString } from '../../entities/ProcessContext';
/**
 * PsCommand - Core Command
 *
 * Report process status.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 *
 * Intent:
 * Process listing.
 */

import { ICommand } from '../ICommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../entities/Command';

import { FileSystemService } from '../../services/FileSystemService';

export class PsCommand implements ICommand {
    constructor(private fs: FileSystemService) { }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const input = getStdinAsString(context);
        // Simple mock output
        const header = '  PID TTY          TIME CMD';
        const sh = ` 1000 pts/0    00:00:00 sh`;
        // maybe add last command?

        return {
            output: `${header}\n${sh}`,
            newState: state,
            exitCode: 0
        };
    }
}
