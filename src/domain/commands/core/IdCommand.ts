/**
 * IdCommand - Core Command
 *
 * Return user identity.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 *
 * Intent:
 * User identity.
 */

import { ICommand } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystem } from '../../entities/FileSystem';

export class IdCommand implements ICommand {
    constructor(private fs: FileSystem) { }

    execute(args: string[], state: TerminalState, input?: string): CommandResponse {
        // uid=1000(operator) gid=1000(operator) groups=1000(operator)
        // Simplified
        const user = state.user || 'operator';
        const uid = 1000;
        const gid = 1000;
        const output = `uid=${uid}(${user}) gid=${gid}(${user}) groups=${gid}(${user})`;

        return {
            output: output,
            newState: state,
            exitCode: 0
        };
    }
}
