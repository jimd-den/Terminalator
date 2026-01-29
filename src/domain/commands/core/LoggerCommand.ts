import { getStdinAsString } from '../../entities/ProcessContext';
/**
 * LoggerCommand - Core Command
 *
 * Log messages.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 *
 * Intent:
 * System logging.
 */

import { ICommand } from '../ICommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../../domain/entities/Command';
import { FileSystem } from '../../entities/FileSystem';

export class LoggerCommand implements ICommand {
    constructor(private fs: FileSystemService) { }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const input = getStdinAsString(context);

        // Basic flag validation for POSIX compliance test
        // Supported (mocked): -t, -i, -s, -f, -p
        for (const arg of args) {
            if (arg.startsWith('-')) {
                const flag = arg.substring(1); // e.g. "z" or "t"
                // Check against known supported flags (simplified)
                if (!['t', 'i', 's', 'f', 'p'].some(f => flag.startsWith(f))) { // startsWith to handle -tTAG
                    return { output: `logger: invalid option -- '${flag}'`, newState: state, exitCode: 1 };
                }
            }
        }

        const msg = args.filter(a => !a.startsWith('-')).join(' ') || input || ''; // Strip flags from msg for now?
        // Actually logger consumes flags and rest is message.
        // For simplicity, we just validate flags and succeed.

        return {
            output: '',
            newState: state,
            exitCode: 0
        };
    }
}
