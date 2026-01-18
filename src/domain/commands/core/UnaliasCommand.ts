/**
 * UnaliasCommand - Core Command
 *
 * Remove aliases.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 *
 * Intent:
 * Clear aliases.
 */

import { ICommand } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystem } from '../../entities/FileSystem';

export class UnaliasCommand implements ICommand {
    constructor(private fs: FileSystem) { }

    execute(args: string[], state: TerminalState, input?: string): CommandResponse {
        const newState = { ...state, aliases: { ...state.aliases } };
        let all = false;

        if (args.includes('-a')) {
            newState.aliases = {};
            return { output: '', newState: newState, exitCode: 0 };
        }

        if (args.length === 0) {
             return { output: 'unalias: missing operand', newState: state, exitCode: 1 };
        }

        for (const name of args) {
            if (newState.aliases[name]) {
                delete newState.aliases[name];
            } else {
                return { output: `unalias: ${name}: not found`, newState: state, exitCode: 1 };
            }
        }

        return {
            output: '',
            newState: newState,
            exitCode: 0
        };
    }
}
