/**
 * LoggerCommand - Core Command
 *
 * Log messages.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 *
 * Intent:
 * System logging.
 */

import { ICommand } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystem } from '../../entities/FileSystem';

export class LoggerCommand implements ICommand {
    constructor(private fs: FileSystem) { }

    execute(args: string[], state: TerminalState, input?: string): CommandResponse {
        const msg = args.join(' ') || input || '';
        // Log to console/telemetry?
        // This command usually writes to syslog.
        // We'll simulate by doing nothing (success) or writing to a log file if tracking.
        return {
            output: '',
            newState: state,
            exitCode: 0
        };
    }
}
