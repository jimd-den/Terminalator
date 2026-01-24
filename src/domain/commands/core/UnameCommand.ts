import { getStdinAsString } from '../../entities/ProcessContext';
/**
 * UnameCommand - Core Command
 *
 * Return system name.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 *
 * Intent:
 * System identification.
 */

import { ICommand } from '../ICommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystem } from '../../entities/FileSystem';

export class UnameCommand implements ICommand {
    constructor(private fs: FileSystemService) { }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const input = getStdinAsString(context);
        let all = false;
        if (args.includes('-a')) all = true;

        const sysname = 'Terminalator';
        const nodename = state.hostname;
        const release = '1.0.0';
        const version = 'POSIX-ISH';
        const machine = 'x86_64-sim';

        let output = sysname;
        if (all) {
            output = `${sysname} ${nodename} ${release} ${version} ${machine}`;
        }

        return {
            output: output,
            newState: state,
            exitCode: 0
        };
    }
}
