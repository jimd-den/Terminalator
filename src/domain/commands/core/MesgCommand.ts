/**
 * MesgCommand - Core Command
 *
 * Permit or deny messages.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 *
 * Intent:
 * Messaging control.
 */

import { ICommand } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystem } from '../../entities/FileSystem';

export class MesgCommand implements ICommand {
    constructor(private fs: FileSystem) { }

    execute(args: string[], state: TerminalState, input?: string): CommandResponse {
        if (args.length === 0) {
            return { output: 'is y', newState: state, exitCode: 0 };
        }
        // mesg y / mesg n
        return {
            output: '',
            newState: state,
            exitCode: 0
        };
    }
}
