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
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystem } from '../../entities/FileSystem';

export class PsCommand implements ICommand {
    constructor(private fs: FileSystem) { }

    execute(args: string[], state: TerminalState, input?: string): CommandResponse {
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
