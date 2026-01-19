/**
 * FalseCommand - Core Command
 *
 * Return false value.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 *
 * Intent:
 * Failure status.
 */

import { ICommand } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';

export class FalseCommand implements ICommand {
    execute(args: string[], state: TerminalState, input?: string): CommandResponse {
        return {
            output: '',
            newState: state,
            exitCode: 1
        };
    }
}
