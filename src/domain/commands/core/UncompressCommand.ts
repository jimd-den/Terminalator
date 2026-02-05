import { getStdinAsString } from '../../entities/ProcessContext';
/**
 * @file UncompressCommand.ts
 * @description The 'uncompress' command. Expand data.
 */
import { ICommand, CommandResponse } from '../ICommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../entities/TerminalState';

export class UncompressCommand implements ICommand {
    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        const input = getStdinAsString(context);
        const fs = context.fileSystemService;
        const file = args[0];

        if (!file) {
            return { output: 'uncompress: missing file', newState: state, exitCode: 1 };
        }

        const node = fs.resolve(file, state.currentDirectory);
        if (!node || fs.isDirectory(node)) {
            return { output: `uncompress: ${file}: No such file or directory`, newState: state, exitCode: 1 };
        }

        const path = fs.getAbsolutePath(node);
        const raw = fs.readFile(path);
        const content = typeof raw === 'string' ? raw : new TextDecoder().decode(raw);

        // Strip header if present
        let decompressed = content;
        if (content.startsWith(`\x1f\x9d`)) {
            decompressed = content.substring(2);
        }

        const newPath = path.replace('.Z', '');
        fs.writeFile(newPath, decompressed, 'w', 1000, 1000, state.currentDirectory);
        fs.deleteNode(path, state.currentDirectory);

        return { output: '', newState: state, exitCode: 0 };
    }
}
