import { ICommand, CommandResponse } from '../../domain/entities/Command';
import { ProcessContext } from '../../domain/entities/ProcessContext';
import { FileSystemService } from '../../domain/services/FileSystemService';
import { TerminalState } from '../../domain/entities/TerminalState';
import { CodeCompiler } from '../../domain/usecases/CodeCompiler';

export class CompileCommand implements ICommand {
    name = 'compile';
    description = 'Process and compile 24XX script files';

    constructor(private compiler: CodeCompiler) { }

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        const input = context.stdin;
        const res = this.compiler.compile(args[0] || '', context.cwd);
        return {
            output: res.output,
            exitCode: res.success ? 0 : 1,
            newState: state
        };
    }
}
