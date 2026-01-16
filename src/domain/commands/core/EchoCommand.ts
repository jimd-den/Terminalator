/**
 * EchoCommand - Core Command
 *
 * Writes arguments to standard output.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 * Pillar: The Storyteller’s Code (Literate Documentation)
 *
 * Intent:
 * Allows the operator to print text or variable values.
 *
 * Compliance:
 * POSIX Std 1003.1-2017: echo - write arguments to standard output.
 * We do not implement -n or escape sequences yet, strictly following basic POSIX.
 */

import { ICommand } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystem } from '../../entities/FileSystem';

export class EchoCommand implements ICommand {
    constructor(private fs: FileSystem) { }

    execute(args: string[], state: TerminalState, input?: string): CommandResponse {
        // POSIX: "The echo utility shall not recognize the -- argument... or any options"
        // But typical usage expects arguments joined by space.

        const output = args.join(' ');

        return {
            output: output,
            newState: state,
            exitCode: 0
        };
    }
}
