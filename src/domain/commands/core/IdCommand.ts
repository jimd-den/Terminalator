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
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystem } from '../../entities/FileSystem';

export class IdCommand implements ICommand {
    constructor(private fs: FileSystemService) { }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const input = context.stdin;
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
