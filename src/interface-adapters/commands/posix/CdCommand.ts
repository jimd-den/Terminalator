import { ICommand, CommandResponse } from '../../../domain/entities/Command';
import { FileSystem } from '../../../domain/entities/FileSystem';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../../domain/entities/TerminalState';

export class CdCommand implements ICommand {
    name = 'cd';
    description = 'Change the shell working directory';

    constructor(/* private fs: FileSystemService */) { }

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        const input = context.stdin;
        const target = args[0] || state.environment.HOME || '/';
        const node = context.fileSystemService.resolve(target, context.cwd);

        if (!node) {
            return {
                output: `cd: no such file or directory: ${target}`,
                exitCode: 1
            };
        }

        if (!context.fileSystemService.isDirectory(node)) {
            return {
                output: `cd: not a directory: ${target}`,
                exitCode: 1
            };
        }

        const newPath = context.fs.getAbsolutePath(node);
        return {
            output: `Changed directory to ${newPath}`,
            exitCode: 0,
            newState: { currentDirectory: newPath }
        };
    }
}
