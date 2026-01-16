import { ICommand, CommandResponse } from '../../../domain/entities/Command';
import { FileSystem } from '../../../domain/entities/FileSystem';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../../domain/entities/TerminalState';

export class MkdirCommand implements ICommand {
    name = 'mkdir';
    description = 'Create the DIRECTORY(ies), if they do not already exist.';

    constructor(private fs: FileSystem) { }

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        if (args.length === 0) {
            return { output: 'mkdir: missing operand', exitCode: 1 };
        }

        const target = args[0];

        try {
            this.fs.createNode(target, 'directory', context.cwd);
            return {
                output: `Directory '${target}' created`,
                exitCode: 0
            };
        } catch (error: any) {
            return {
                output: `mkdir: ${error.message || error}`,
                exitCode: 1
            };
        }
    }
}
