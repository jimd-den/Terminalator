import { getStdinAsString } from '../../entities/ProcessContext';
/**
 * WriteCommand - Core Command
 *
 * Write to another user.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 *
 * Intent:
 * Messaging.
 */

import { ICommand } from '../ICommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystem } from '../../entities/FileSystem';

export class WriteCommand implements ICommand {
    constructor(private fs: FileSystemService) { }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const input = getStdinAsString(context);
        const target = args[0];
        if (!target) {
             return { output: 'write: missing operand', newState: state, exitCode: 1 };
        }

        // Normally interactive. With input, send it.
        const message = input || args.slice(1).join(' '); // Allow inline msg for simulation simplicity

        // Simulating "sending"
        return {
            output: `Message from ${state.user || 'operator'}@${state.hostname} on ${new Date().toLocaleTimeString()} ...\n${message}\nEOF`,
            newState: state,
            exitCode: 0
        };
    }
}
