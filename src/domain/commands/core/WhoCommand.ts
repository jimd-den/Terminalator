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
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystem } from '../../entities/FileSystem';

export class WhoCommand implements ICommand {
    constructor(private fs: FileSystem) { }

    execute(args: string[], state: TerminalState, input?: string): CommandResponse {
        const user = state.user || 'operator';
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
