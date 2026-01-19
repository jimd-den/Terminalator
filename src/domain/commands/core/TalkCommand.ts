/**
 * TalkCommand - Core Command
 *
 * Talk to another user.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 *
 * Intent:
 * Chat.
 */

import { ICommand } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystem } from '../../entities/FileSystem';

export class TalkCommand implements ICommand {
    constructor(private fs: FileSystem) { }

    execute(args: string[], state: TerminalState, input?: string): CommandResponse {
        const target = args[0];
        if (!target) {
             return { output: 'talk: missing operand', newState: state, exitCode: 1 };
        }

        // Simulation
        return {
            output: `[Checking for invitation on ${state.hostname}]`,
            newState: state,
            exitCode: 0
        };
    }
}
