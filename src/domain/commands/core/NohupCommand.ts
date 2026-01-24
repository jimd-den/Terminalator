import { getStdinAsString } from '../../entities/ProcessContext';
/**
 * NohupCommand - Core Command
 *
 * Invoke a utility immune to hangups.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 *
 * Intent:
 * Run command, redirecting output.
 */

import { ICommand } from '../ICommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystem } from '../../entities/FileSystem';

export class NohupCommand implements ICommand {
    constructor(
        private fs: FileSystemService,
        private commandProvider: (name: string) => ICommand | undefined
    ) { }

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        const input = getStdinAsString(context);
        if (args.length === 0) {
             return { output: 'nohup: missing operand', newState: state, exitCode: 1 };
        }

        const cmdName = args[0];
        const utilityArgs = args.slice(1);

        const command = this.commandProvider(cmdName);
        if (!command) {
            return { output: `nohup: ignoring input and appending output to 'nohup.out'\nnohup: failed to run command '${cmdName}': No such file or directory`, newState: state, exitCode: 127 };
        }

        // Redirect stdout/stderr to nohup.out
        // In this simulation, we capture output and write it.

        let response: CommandResponse;
        try {
            // "nohup: ignoring input and appending output to 'nohup.out'"
            response = await command.execute(utilityArgs, state, input); // pass input? nohup usually redirects stdin from /dev/null if terminal.

            // Append output to nohup.out
            const outFile = 'nohup.out';
            const path = state.currentDirectory === '/' ? `/${outFile}` : `${state.currentDirectory}/${outFile}`;

            let existing = '';
            try { existing = this.fs.readFile(path); } catch (e) {}

            this.fs.writeFile(path, existing + response.output + '\n', 'w');

            return {
                output: `nohup: ignoring input and appending output to '${outFile}'`,
                newState: response.newState,
                exitCode: response.exitCode // "If the utility is invoked, the exit status ... shall be the exit status of the utility."
            };

        } catch (e: any) {
            return { output: `nohup: failed to run command '${cmdName}': ${e.message}`, newState: state, exitCode: 127 };
        }
    }
}
