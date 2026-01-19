/**
 * AtCommand - Core Command
 *
 * Execute commands at a later time.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 *
 * Intent:
 * Job scheduling (mock).
 */

import { ICommand } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystem } from '../../entities/FileSystem';

export class AtCommand implements ICommand {
    constructor(private fs: FileSystem) { }

    execute(args: string[], state: TerminalState, input?: string): CommandResponse {
        // at time...
        // Read stdin for commands
        const commands = input || '';
        if (!commands && args.length > 0) {
            // Interactive mode not supported easily without input.
            // Just simulate acceptance.
        }

        // Mock output
        return {
            output: 'job 1 at 2023-10-27 10:00',
            newState: state,
            exitCode: 0
        };
    }
}
