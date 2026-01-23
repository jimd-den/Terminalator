/**
 * @file DdCommand.ts
 * @description The 'dd' command. Convert and copy a file.
 */
import { ICommand, CommandResponse } from '../ICommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../entities/TerminalState';

export class DdCommand implements ICommand {
    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        const _input = context.stdin;
        const input = context.stdin;
        let inputFile = '';
        let outputFile = '';

        for (const arg of args) {
            if (arg.startsWith('if=')) inputFile = arg.substring(3);
            else if (arg.startsWith('of=')) outputFile = arg.substring(3);
        }

        const fs = context.fileSystemService;
        let content = _input || '';

        if (inputFile) {
            const node = fs.resolve(inputFile, state.currentDirectory);
            if (!node || fs.isDirectory(node)) {
                return { output: `dd: ${inputFile}: No such file`, newState: state, exitCode: 1 };
            }
            content = fs.readFile(fs.getAbsolutePath(node));
        }

        if (outputFile) {
            fs.writeFile(outputFile, content, 'w', state.currentDirectory);
        } else {
            return { output: content, newState: state, exitCode: 0 };
        }

        return { output: '', newState: state, exitCode: 0 };
    }
}
