/**
 * GetconfCommand - Core Command
 *
 * Get configuration values.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 *
 * Intent:
 * System config.
 */

import { ICommand } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystem } from '../../entities/FileSystem';

export class GetconfCommand implements ICommand {
    constructor(private fs: FileSystem) { }

    execute(args: string[], state: TerminalState, input?: string): CommandResponse {
        const key = args[0];
        if (!key) {
             return { output: 'getconf: missing operand', newState: state, exitCode: 1 };
        }

        // Mock values
        const config: Record<string, string> = {
            'PATH_MAX': '4096',
            'NAME_MAX': '255',
            'ARG_MAX': '131072'
        };

        if (config[key]) {
            return { output: config[key], newState: state, exitCode: 0 };
        }

        return { output: 'undefined', newState: state, exitCode: 1 };
    }
}
