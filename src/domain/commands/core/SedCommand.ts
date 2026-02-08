import { getStdinAsString } from '../../entities/ProcessContext';
/**
 * SedCommand - Core Command
 *
 * Stream Editor for filtering and transforming text.
 * 
 * Pillar: The Four-Fold Shield (Strict Architecture) - Use Cases/Command
 * Pillar: The Balanced Scale (SOLID / KISS) - Delegating to SedEngine
 * Pillar: The Storyteller’s Code (Literate Documentation)
 *
 * Intent:
 * Provides a POSIX-compliant entry point for the sed utility.
 * Refactored to implement IStructuredCommand for combinatorial scaling.
 */

import { CommandBase } from '../CommandBase';
import { CommandCapability } from '../IStructuredCommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../entities/Command';

import { FileSystemService } from '../../services/FileSystemService';
import { SedParser, SedVM, SedState } from '../../services/SedEngine';

export class SedCommand extends CommandBase {
    public readonly capabilities = [CommandCapability.FILTER, CommandCapability.TRANSFORM];
    public readonly utility = 'sed';

    constructor(private fs: FileSystemService) { 
        super();
    }

    protected override parseArgs(args: string[]) {
        // sed options that take arguments: -e, -f
        super.parseArgs(args, ['e', 'f']);
    }

    protected async executeInternal(
        rawArgs: string[],
        flags: Set<string>,
        operands: string[],
        context: ProcessContext,
        state: TerminalState
    ): Promise<CommandResponse> {
        const input = getStdinAsString(context);
        const scripts: string[] = [];
        const files: string[] = [];
        const suppressAutoPrint = flags.has('n');
        const ereMode = flags.has('E');
        const inPlace = flags.has('i');

        // Extract scripts from -e and -f
        const eOptions = this.options.get('e');
        if (eOptions) scripts.push(eOptions);

        const fOptions = this.options.get('f');
        if (fOptions) {
            try {
                scripts.push(this.fs.readFile(this.resolvePath(fOptions, state)));
            } catch (e) {
                return { output: `sed: cannot read script file ${fOptions}`, newState: state, exitCode: 1 };
            }
        }

        let opIndex = 0;
        if (scripts.length === 0 && operands.length > 0) {
            scripts.push(operands[opIndex++]);
        }

        while (opIndex < operands.length) {
            files.push(operands[opIndex++]);
        }

        if (scripts.length === 0) {
            return { output: 'sed: missing script', newState: state, exitCode: 1 };
        }

        let instructions;
        try {
            instructions = SedParser.parse(scripts.join('\n'), ereMode);
        } catch (e: any) {
            return { output: `sed: ${e.message}`, newState: state, exitCode: 1 };
        }

        const processContent = (content: string) => {
            const lines = content.split('\n');
            const hasTrailingNewline = content.endsWith('\n');
            if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();

            let sedState: SedState = {
                patternSpace: '',
                holdSpace: '',
                lineNumber: 0,
                isLastLine: false,
                deleted: false,
                printed: [],
                nextCycle: false,
                quit: false,
                substSuccess: false,
                rangeActive: [],
                rangeEnding: [],
                insertBuffer: [],
                appendBuffer: [],
                lines: lines,
                currentIndex: 0,
                suppressAutoPrint: suppressAutoPrint
            };

            const resultLines: string[] = [];

            for (let j = 0; j < lines.length; j++) {
                sedState.currentIndex = j;
                sedState.patternSpace = lines[j];
                sedState.lineNumber = j + 1;
                sedState.isLastLine = (j === lines.length - 1);
                sedState.substSuccess = false;
                sedState.printed = [];

                sedState = SedVM.execute(instructions, sedState);

                for (const il of sedState.insertBuffer) resultLines.push(il);
                for (const pl of sedState.printed) resultLines.push(pl);

                if (!sedState.deleted) {
                    if (!suppressAutoPrint) resultLines.push(sedState.patternSpace);
                }

                for (const al of sedState.appendBuffer) resultLines.push(al);

                j = sedState.currentIndex;
                if (sedState.quit) break;
            }

            let result = resultLines.join('\n');
            if (result.length > 0 || hasTrailingNewline) result += '\n';
            return result;
        };

        if (files.length === 0) {
            if (input !== undefined) {
                return { output: processContent(input), newState: state, exitCode: 0 };
            }
            return { output: '', newState: state, exitCode: 0 };
        }

        let totalOutput = '';
        for (const filename of files) {
            const path = this.resolvePath(filename, state);
            try {
                const content = this.fs.readFile(path);
                const result = processContent(content);
                if (inPlace) {
                    this.fs.writeFile(path, result, 'w');
                } else {
                    totalOutput += result;
                }
            } catch (e: any) {
                return { output: `sed: ${filename}: ${e.message}`, newState: state, exitCode: 1 };
            }
        }

        return {
            output: totalOutput,
            newState: state,
            exitCode: 0
        };
    }

    private resolvePath(filename: string, state: TerminalState): string {
        if (filename.startsWith('/')) return filename;
        return state.currentDirectory === '/' ? `/${filename}` : `${state.currentDirectory}/${filename}`;
    }
}