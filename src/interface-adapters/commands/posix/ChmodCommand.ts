import { ICommand, CommandResponse } from '../../../domain/entities/Command';
import { FileSystem } from '../../../domain/entities/FileSystem';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../../domain/entities/TerminalState';

export class ChmodCommand implements ICommand {
    name = 'chmod';
    description = 'Change file mode bits';

    constructor(/* private fs: FileSystemService */) { }

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        const input = context.stdin;
        if (args.length < 2) {
            return { output: 'chmod: missing operand', exitCode: 1 };
        }

        const mode = args[0];
        const target = args[1];

        try {
            // Parse octal mode
            // We assume input is like "755" or "0755"
            // We do not support +x symbolic modes yet in this lower level adapter.
            const octalMode = parseInt(mode, 8);
            if (isNaN(octalMode)) {
                return { output: `chmod: invalid mode: '${mode}'`, exitCode: 1 };
            }

            context.fs.chmod(target, octalMode, context.cwd);
            return { output: '', exitCode: 0 };
        } catch (e: any) {
            return { output: `chmod: ${e.message}`, exitCode: 1 };
        }
    }
}
