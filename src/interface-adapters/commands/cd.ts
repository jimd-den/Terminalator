import { ICommand, CommandResponse } from '../../domain/entities/Command';
import { FileSystem } from '../../domain/entities/FileSystem';
import { ProcessContext } from '../../domain/entities/ProcessContext';
import { TerminalState } from '../../domain/entities/TerminalState';

export class CDCommand implements ICommand {
    name = 'cd';
    description = 'Change the shell working directory';

    constructor(private fs: FileSystem) { }

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        const target = args[0] || state.environment.HOME || '/';
        const node = this.fs.resolveNode(target, context.cwd);

        if (!node) {
            return {
                output: `cd: no such file or directory: ${target}`,
                exitCode: 1
            };
        }

        if (node.type !== 'directory') {
            return {
                output: `cd: not a directory: ${target}`,
                exitCode: 1
            };
        }

        const newPath = this.fs.getAbsolutePath(node);
        return {
            output: `Changed directory to ${newPath}`,
            exitCode: 0,
            newState: { currentDirectory: newPath }
        };
    }
}
