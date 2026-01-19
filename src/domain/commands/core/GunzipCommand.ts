/**
 * @file GunzipCommand.ts
 * @description The 'gunzip' command. Decompress files.
 */
import { ICommand, CommandResponse } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';

export class GunzipCommand implements ICommand {
    async execute(args: string[], state: TerminalState, _input?: string): Promise<CommandResponse> {
         if (args.length === 0) {
             return { output: '', newState: state, exitCode: 0 };
        }
        return { output: '', newState: state, exitCode: 0 };
    }
}
