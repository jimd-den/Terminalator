/**
 * ManCommand - Core Command
 *
 * Display system documentation.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 *
 * Intent:
 * Help.
 */

import { ICommand } from '../ICommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystem } from '../../entities/FileSystem';

export class ManCommand implements ICommand {
    constructor(private fs: FileSystemService) { }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const input = context.stdin;
        const topic = args[0];
        if (!topic) {
             return { output: 'What manual page do you want?', newState: state, exitCode: 1 };
        }

        return {
            output: `Man page for ${topic}: [Simulated help content]`,
            newState: state,
            exitCode: 0
        };
    }
}
