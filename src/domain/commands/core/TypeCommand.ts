import { getStdinAsString } from '../../entities/ProcessContext';
/**
 * TypeCommand - Core Command
 *
 * Write a description of command type.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 *
 * Intent:
 * Identify command nature.
 */

import { ICommand } from '../ICommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystem } from '../../entities/FileSystem';
import { CommandRegistry } from '../CommandRegistry'; // Need access to registry to check if command exists

export class TypeCommand implements ICommand {
    constructor(private fs: FileSystemService, private registry?: CommandRegistry) { }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const input = getStdinAsString(context);
        if (args.length === 0) return { output: '', newState: state, exitCode: 0 };

        const outputs: string[] = [];
        let exitCode = 0;

        for (const name of args) {
            if (state.aliases[name]) {
                outputs.push(`${name} is an alias for ${state.aliases[name]}`);
            } else if (this.registry && this.registry.get(name)) {
                // Builtin? or command?
                outputs.push(`${name} is a command`); // Simplified
            } else {
                outputs.push(`type: ${name}: not found`);
                exitCode = 1;
            }
        }

        return {
            output: outputs.join('\n'),
            newState: state,
            exitCode: exitCode
        };
    }
}
