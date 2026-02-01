import { getStdinAsString } from '../../entities/ProcessContext';
/**
 * WhoCommand - Core Command
 *
 * Show who is logged on.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 *
 * Intent:
 * User session info.
 */

import { ICommand } from '../ICommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../../domain/entities/Command';
import { FileSystem } from '../../entities/FileSystem';

export class WhoCommand implements ICommand {
    constructor(private fs: FileSystemService) { }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const input = getStdinAsString(context);
        const user = state.environment['USER'] || 'operator';
        const line = 'tty1';
        const date = new Date().toISOString().slice(0, 16).replace('T', ' '); // Simplified date
        // standard who output: operator tty1 2023-10-27 10:00
        const output = `${user}   ${line}   ${date}`;

        return {
            output: output,
            newState: state,
            exitCode: 0
        };
    }
}
