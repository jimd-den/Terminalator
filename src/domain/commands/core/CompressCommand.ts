import { getStdinAsString } from '../../entities/ProcessContext';
/**
 * @file CompressCommand.ts
 * @description The 'compress' command. Compress data.
 */
import { ICommand, CommandResponse } from '../ICommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../entities/TerminalState';

export class CompressCommand implements ICommand {
    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        const input = getStdinAsString(context);
        // compress file -> file.Z
        const fs = context.fileSystemService;
        const file = args[0];

        if (!file) {
            return { output: 'compress: missing file', newState: state, exitCode: 1 };
        }

        const node = fs.resolve(file, state.currentDirectory);
        if (!node || fs.isDirectory(node)) {
            return { output: `compress: ${file}: No such file or directory`, newState: state, exitCode: 1 };
        }

        const path = fs.getAbsolutePath(node);
        const content = fs.readFile(path);

        // Simple "compression": wrap in token? Or just copy.
        // POSIX compress uses LZW. We can just pretend.
        const compressed = `\x1f\x9d` + content; // magic header

        fs.writeFile(path + '.Z', compressed, 'w', state.currentDirectory);
        fs.deleteNode(path, state.currentDirectory);

        return { output: '', newState: state, exitCode: 0 };
    }
}
