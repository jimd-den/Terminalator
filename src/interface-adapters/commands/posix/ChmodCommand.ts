import { ICommand, CommandResponse } from '../../../domain/entities/Command';
import { FileSystem } from '../../../domain/entities/FileSystem';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../../domain/entities/TerminalState';

export class ChmodCommand implements ICommand {
    name = 'chmod';
    description = 'Change file mode bits';

    constructor(private fs: FileSystem) { }

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        if (args.length < 2) {
            return { output: 'chmod: missing operand', exitCode: 1 };
        }

        const mode = args[0];
        const target = args[1];

        try {
            // Ideally we'd validate 'mode' (e.g. 777 or +x) 
            // For now, we accept the raw string as the simulation allows flexible permission strings.
            // If we want to simulate "777" -> "rwxrwxrwx", we'd add a converter helper.
            this.fs.chmod(target, mode, context.cwd);
            return { output: '', exitCode: 0 };
        } catch (e: any) {
            return { output: `${e.message}`, exitCode: 1 }; // e.message already has prefix
        }
    }
}
