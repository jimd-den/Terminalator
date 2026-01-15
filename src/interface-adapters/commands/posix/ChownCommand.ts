import { ICommand, CommandResponse } from '../../../domain/entities/Command';
import { FileSystem } from '../../../domain/entities/FileSystem';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../../domain/entities/TerminalState';

export class ChownCommand implements ICommand {
    name = 'chown';
    description = 'Change file owner and group';

    constructor(private fs: FileSystem) { }

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        if (args.length < 2) {
            return { output: 'chown: missing operand', exitCode: 1 };
        }

        const owner = args[0];
        const target = args[1];

        try {
            this.fs.chown(target, owner, context.cwd);
            return { output: '', exitCode: 0 };
        } catch (e: any) {
            return { output: `${e.message}`, exitCode: 1 };
        }
    }
}
