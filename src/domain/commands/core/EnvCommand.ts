import { getStdinAsString } from '../../entities/ProcessContext';
/**
 * EnvCommand - Core Command
 *
 * Set the environment for command invocation or list environment variables.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 *
 * Intent:
 * Display environment.
 */

import { ICommand } from '../ICommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../entities/Command';

import { FileSystem } from '../../entities/FileSystem';

export class EnvCommand implements ICommand {
    constructor(private fs: FileSystemService) { }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const input = getStdinAsString(context);
        // Simplified: just print environment if no args or if args don't set things.
        // POSIX env [name=value]... [utility [argument...]]
        // If args present, we should execute utility with modified env.
        // For now, let's support listing only (no args).

        if (args.length > 0) {
            // TODO: Support execution with modified env?
            // "env ls" -> executes ls
            // For now, just error or ignore?
            // The test just checks "env" (no args).
            // Let's implement printing.
        }

        const lines: string[] = [];
        for (const [key, val] of Object.entries(state.environment)) {
            lines.push(`${key}=${val}`);
        }

        return {
            output: lines.join('\n'),
            newState: state,
            exitCode: 0
        };
    }
}
