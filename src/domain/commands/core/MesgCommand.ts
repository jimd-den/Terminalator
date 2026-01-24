import { getStdinAsString } from '../../entities/ProcessContext';
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
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystem } from '../../entities/FileSystem';

export class MesgCommand implements ICommand {
    constructor(private fs: FileSystemService) { }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const input = getStdinAsString(context);
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
