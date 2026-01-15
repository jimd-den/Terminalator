import { ICommand, CommandResponse } from '../../../domain/entities/Command';
import { FileSystem } from '../../../domain/entities/FileSystem';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../../domain/entities/TerminalState';

export class CpCommand implements ICommand {
    name = 'cp';
    description = 'Copy files and directories';

    constructor(private fs: FileSystem) { }

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        if (args.length < 2) {
            return { output: 'cp: missing file operand', exitCode: 1 };
        }

        const sourcePath = args[0];
        const destPath = args[1];

        const sourceNode = this.fs.resolveNode(sourcePath, context.cwd);
        if (!sourceNode) {
            return { output: `cp: cannot stat '${sourcePath}': No such file or directory`, exitCode: 1 };
        }

        if (sourceNode.type === 'directory') {
            return { output: `cp: -r not specified; omitting directory '${sourcePath}'`, exitCode: 1 };
        }

        try {
            // Write file handles update or create.
            // If dest is directory, we append filename.
            let finalDest = destPath;
            const destNode = this.fs.resolveNode(destPath, context.cwd);
            if (destNode && destNode.type === 'directory') {
                finalDest = destPath.endsWith('/') ? `${destPath}${sourceNode.name}` : `${destPath}/${sourceNode.name}`;
            }

            this.fs.writeFile(finalDest, sourceNode.content || '', 'w', context.cwd);
            return { output: '', exitCode: 0 };
        } catch (e: any) {
            return { output: `cp: ${e.message}`, exitCode: 1 };
        }
    }
}
