/**
 * @file LocaleCommand.ts
 * @description The 'locale' command. Get locale-specific information.
 */
import { ICommand, CommandResponse } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';

export class LocaleCommand implements ICommand {
    async execute(_args: string[], state: TerminalState, _input?: string): Promise<CommandResponse> {
        return { output: 'LANG=en_US.UTF-8\nLC_ALL=', newState: state, exitCode: 0 };
    }
}
