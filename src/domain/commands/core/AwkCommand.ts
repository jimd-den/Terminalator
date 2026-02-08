import { getStdinAsString } from '../../entities/ProcessContext';
/**
 * AwkCommand - Core Command
 *
 * Pattern scanning and processing language.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 * Pillar: The Storyteller’s Code (Literate Documentation)
 *
 * Intent:
 * Allows the operator to process text columns.
 * Refactored to implement IStructuredCommand for combinatorial scaling.
 */

import { CommandBase } from '../CommandBase';
import { CommandCapability } from '../IStructuredCommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../entities/Command';

import { FileSystemService } from '../../services/FileSystemService';
import { AwkLexer } from './awk/AwkLexer';
import { AwkParser } from './awk/AwkParser';
import { AwkInterpreter } from './awk/AwkInterpreter';

export class AwkCommand extends CommandBase {
    public readonly capabilities = [CommandCapability.TRANSFORM, CommandCapability.FILTER];
    public readonly utility = 'awk';

    constructor(private fs: FileSystemService) {
        super();
    }

    /**
     * Protocol: Build arguments programmatically.
     */
    public override buildArgs(requirements: Record<string, any>): string[] {
        const args: string[] = [];
        if (requirements.fieldSeparator) args.push('-F', requirements.fieldSeparator);
        if (requirements.program) args.push(requirements.program);
        if (requirements.path) args.push(requirements.path);
        return args;
    }

    protected override parseArgs(args: string[]) {
        // awk options that take arguments: -F, -v
        super.parseArgs(args, ['F', 'v']);
    }

    protected async executeInternal(
        rawArgs: string[],
        flags: Set<string>,
        operands: string[],
        context: ProcessContext,
        state: TerminalState
    ): Promise<CommandResponse> {
        const input = getStdinAsString(context);
        let program = '';
        const files: string[] = [];
        let fieldSeparator = this.options.get('F') || ' ';

        let opIndex = 0;
        if (operands.length > 0) {
            program = operands[opIndex++];
        }

        while (opIndex < operands.length) {
            files.push(operands[opIndex++]);
        }

        if (!program) {
            return { output: 'awk: missing program', newState: state, exitCode: 1 };
        }

        if ((program.startsWith("'") && program.endsWith("'")) || (program.startsWith('"') && program.endsWith('"'))) {
            program = program.slice(1, -1);
        }

        try {
            if (fieldSeparator !== ' ') {
                program = `BEGIN { FS="${fieldSeparator}" } ` + program;
            }

            const lexer = new AwkLexer(program);
            const tokens = lexer.tokenize();

            const parser = new AwkParser(tokens);
            const ast = parser.parse();

            let content = '';
            if (files.length > 0) {
                for (const file of files) {
                    try {
                        const path = file.startsWith('/') ? file : (state.currentDirectory === '/' ? `/${file}` : `${state.currentDirectory}/${file}`);
                        content += this.fs.readFile(path) + '\n';
                    } catch (e: any) {
                        return { output: `awk: ${file}: ${e.message}`, newState: state, exitCode: 1 };
                    }
                }
                if (content.endsWith('\n')) content = content.slice(0, -1);
            } else if (input !== undefined) {
                content = input;
            }

            const interpreter = new AwkInterpreter();
            const output = interpreter.execute(ast, content);
            return { output: output.trimEnd(), newState: state, exitCode: 0 };

        } catch (e: any) {
            return { output: `awk: ${e.message}`, newState: state, exitCode: 1 };
        }
    }
}