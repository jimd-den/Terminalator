import { getStdinAsString } from '../../entities/ProcessContext';
/**
 * GccCommand - Domain Layer
 *
 * Implements the 'gcc' command using the internal CodeCompiler.
 * 
 * Pillar: THE MASTER'S TOOL (Command Pattern)
 */

import { ICommand, CommandResponse } from '../ICommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { FileSystemService } from '../../services/FileSystemService';
import { CodeCompiler } from '../../usecases/CodeCompiler';

export class GccCommand implements ICommand {
    constructor(
        private compiler: CodeCompiler,
        private fs: FileSystemService
    ) { }

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        if (args.length === 0) {
            return {
                output: 'gcc: fatal error: no input files',
                newState: state,
                exitCode: 1
            };
        }

        const res = this.compiler.compile(args[0], context.cwd);
        
        return {
            output: res.output,
            exitCode: res.success ? 0 : 1,
            newState: state
        };
    }
}