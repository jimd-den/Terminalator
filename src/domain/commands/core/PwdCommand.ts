/**
 * PwdCommand - Core Command
 *
 * Prints the current working directory.
 *
 * Pillar: The Swift Stream (Performance & Purity)
 * Pillar: The Balanced Scale (SOLID / KISS)
 * Pillar: The Storyteller’s Code (Literate Documentation)
 *
 * Intent:
 * Helps the operator understand their current location in the file system.
 */

import { ICommand } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystem } from '../../entities/FileSystem';

export class PwdCommand implements ICommand {
    constructor(private fs: FileSystem) { }

    execute(args: string[], state: TerminalState, input?: string): CommandResponse {
        return {
            output: state.currentDirectory + '\n',
            newState: state,
            exitCode: 0
        };
    }
}
