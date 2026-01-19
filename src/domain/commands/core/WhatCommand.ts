/**
 * @file WhatCommand.ts
 * @description The 'what' command. Identify SCCS files.
 */
import { ICommand, CommandResponse } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';

export class WhatCommand implements ICommand {
    async execute(_args: string[], state: TerminalState, _input?: string): Promise<CommandResponse> {
        return { output: '', newState: state, exitCode: 0 };
    }
}
