import { getStdinAsString } from '../../entities/ProcessContext';
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
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';

export class FalseCommand implements ICommand {
    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const input = getStdinAsString(context);
        return {
            output: '',
            newState: state,
            exitCode: 1
        };
    }
}
