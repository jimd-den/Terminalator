import { getStdinAsString } from '../../entities/ProcessContext';
/**
 * AliasCommand - Core Command
 *
 * Define or display aliases.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 *
 * Intent:
 * Shell aliases.
 */

import { ICommand } from '../ICommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystem } from '../../entities/FileSystem';

export class AliasCommand implements ICommand {
    constructor(private fs: FileSystemService) { }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const input = getStdinAsString(context);
        if (args.length === 0) {
            // print all
            const lines: string[] = [];
            for (const [key, val] of Object.entries(state.aliases)) {
                lines.push(`${key}=${val}`); // POSIX format usually `alias name='value'`
            }
            return {
                output: lines.join('\n'),
                newState: state,
                exitCode: 0
            };
        }

        const newState = { ...state, aliases: { ...state.aliases } };
        let output = '';

        for (const arg of args) {
            if (arg.includes('=')) {
                const parts = arg.split('=');
                const name = parts[0];
                const val = parts.slice(1).join('='); // Handle multiple =
                newState.aliases[name] = val;
            } else {
                // Print specific alias
                if (newState.aliases[arg]) {
                    output += `${arg}=${newState.aliases[arg]}\n`;
                } else {
                    return { output: `alias: ${arg}: not found`, newState: state, exitCode: 1 };
                }
            }
        }

        return {
            output: output.trim(),
            newState: newState,
            exitCode: 0
        };
    }
}
