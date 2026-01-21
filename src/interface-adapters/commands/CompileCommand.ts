/**
 * CompileCommand - Game Command
 *
 * Compiles and executes 24XX script files.
 *
 * Pillar: The Storyteller’s Code (Literate Documentation)
 * Pillar: The Four-Fold Shield (Strict Architecture)
 */

import { ICommand } from '../../domain/commands/ICommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../domain/entities/TerminalState';
import { CommandResponse } from '../../domain/usecases/ExecuteCommand';
import { CodeCompiler } from '../../domain/usecases/CodeCompiler';

export class CompileCommand implements ICommand {
    constructor(private compiler: CodeCompiler) {}

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const input = context.stdin;
        const res = this.compiler.compile(args[0] || '');
        return {
            output: res.output,
            newState: state,
            exitCode: res.success ? 0 : 1,
        };
    }
}
