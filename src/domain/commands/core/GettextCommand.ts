/**
 * @file GettextCommand.ts
 * @description The 'gettext' command. Retrieve text string from the message database.
 */
import { ICommand, CommandResponse } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';

export class GettextCommand implements ICommand {
    async execute(args: string[], state: TerminalState, _input?: string): Promise<CommandResponse> {
        if (args.length > 0) return { output: args[0], newState: state, exitCode: 0 };
        return { output: '', newState: state, exitCode: 0 };
    }
}
