/**
 * @file NgettextCommand.ts
 * @description The 'ngettext' command. Retrieve text string from the message database.
 */
import { ICommand, CommandResponse } from '../ICommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../entities/TerminalState';

export class NgettextCommand implements ICommand {
    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        const input = context.stdin;
        if (args.length > 0) return { output: args[0], newState: state, exitCode: 0 };
        return { output: '', newState: state, exitCode: 0 };
    }
}
