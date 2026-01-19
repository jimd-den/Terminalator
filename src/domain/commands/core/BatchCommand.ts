/**
 * BatchCommand - Core Command
 *
 * Schedule commands to be executed in a batch queue.
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

export class BatchCommand implements ICommand {
    constructor(private fs: FileSystem) { }

    execute(args: string[], state: TerminalState, input?: string): CommandResponse {
        return {
            output: 'job 2 at 2023-10-27 10:00',
            newState: state,
            exitCode: 0
        };
    }
}
