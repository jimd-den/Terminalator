import { getStdinAsString } from '../../entities/ProcessContext';
/**
 * TrueCommand - Core Command
 *
 * Return true value.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 *
 * Intent:
 * Success status.
 */

import { ICommand } from '../ICommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../entities/Command';


export class TrueCommand implements ICommand {
    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const input = getStdinAsString(context);
        return {
            output: '',
            newState: state,
            exitCode: 0
        };
    }
}
