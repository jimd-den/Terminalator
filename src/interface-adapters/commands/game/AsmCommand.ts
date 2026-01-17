/**
 * AsmCommand - Interface Adapter Layer
 * 
 * Implements the 'asm' command for the terminal.
 * Supports assembling and running RISC-V files.
 * 
 * Pillar: THE SHADOW’S VEIL (Clean Architecture) - Adapters
 * Pillar: THE STORYTELLER’S CODE (Literate Documentation)
 * 
 * Intent:
 * Connects the file system and hardware logic.
 * Provides a user-facing entry point for the VM.
 */

import { ICommand } from '../../../domain/commands/ICommand';
import { CommandResponse } from '../../../domain/usecases/ExecuteCommand';
import { TerminalState } from '../../../domain/entities/TerminalState';
import { FileSystem } from '../../../domain/entities/FileSystem';
import { Assembler } from '../../../domain/usecases/asm/Assembler';
import { RISCVInterpreter } from '../../../domain/usecases/asm/RISCVInterpreter';
import { CpuState } from '../../../domain/entities/asm/CpuState';

export class AsmCommand implements ICommand {
    readonly name = 'asm';
    readonly description = 'RISC-V Assembler & VM';

    private assembler = new Assembler();
    private interpreter = new RISCVInterpreter();
    private cpu = new CpuState();

    constructor(private fs: FileSystem) { }

    async execute(args: string[], state: TerminalState): Promise<CommandResponse> {
        if (args.length < 2 || args[0] !== 'run') {
            return {
                output: 'Usage: asm run <file.s>',
                newState: state,
                exitCode: 1
            };
        }

        const filename = args[1];
        try {
            const source = this.fs.readFile(filename, state.currentDirectory);

            // Step 1: Assemble
            const { program, memory, labels } = this.assembler.assemble(source);

            // Step 2: Run
            const { stdout, exitCode } = this.interpreter.run(program, memory, this.cpu, labels);

            return {
                output: stdout + `\n[VM EXITED WITH CODE ${exitCode}]`,
                newState: state,
                exitCode: 0
            };
        } catch (err: any) {
            return {
                output: `ASM ERROR: ${err.message}`,
                newState: state,
                exitCode: 1
            };
        }
    }
}
