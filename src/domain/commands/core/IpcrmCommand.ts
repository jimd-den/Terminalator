/**
 * @file IpcrmCommand.ts
 * @description The 'ipcrm' command. Remove an XSI interprocess communication identifier.
 */
import { ICommand, CommandResponse } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';

export class IpcrmCommand implements ICommand {
    async execute(_args: string[], state: TerminalState, _input?: string): Promise<CommandResponse> {
        return { output: '', newState: state, exitCode: 0 };
    }
}
