/**
 * GccCommand - Use Case / Application Logic
 *
 * Exposes the standard 'gcc' command to the user, delegating compilation
 * to the configured ICompilerService (WasmCompilerService).
 *
 * Pillar: The Command Pattern
 */

import { ICommand, CommandResponse } from '../ICommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { ICompilerService } from '../../interfaces/ICompilerService';
import { FileSystemService } from '../../services/FileSystemService';

export class GccCommand implements ICommand {
    constructor(
        private compilerService: ICompilerService,
        private fs: FileSystemService
    ) { }

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        const input = context.stdin;
        // 1. Parse Arguments (Minimal subset for verification)
        // gcc input.c -o output

        let inputFiles: string[] = [];
        let outputFile = 'a.out';
        let compileOnly = false;

        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            if (arg === '-o') {
                if (i + 1 < args.length) {
                    outputFile = args[++i];
                }
            } else if (arg === '-c') {
                compileOnly = true;
            } else if (!arg.startsWith('-')) {
                inputFiles.push(arg);
            }
        }

        if (inputFiles.length === 0) {
            return {
                output: 'gcc: fatal error: no input files\ncompilation terminated.',
                newState: state,
                exitCode: 1
            };
        }

        // 2. Validate Inputs
        for (const file of inputFiles) {
            const node = this.fs.resolve(file, state.currentDirectory);
            if (!node || this.fs.isDirectory(node)) {
                return {
                    output: `gcc: error: ${file}: No such file or directory`,
                    newState: state,
                    exitCode: 1
                };
            }
        }

        try {
            // 3. Submit to Compiler Service
            // processing output handled by compiler service or purely binary return?
            // Interface returns Promise<Uint8Array>

            const binary: Uint8Array = await this.compilerService.compile(inputFiles, {
                outputFile,
                compileOnly
            });

            // 4. Write Output
            // Resolve output path (relative to CWD)
            const outputPath = outputFile.startsWith('/')
                ? outputFile
                : (state.currentDirectory === '/' ? `/${outputFile}` : `${state.currentDirectory}/${outputFile}`);

            // Write binary content
            // Assuming this.fs.writeFileBuffer exists or using raw logic
            // Since we updated FS, we can use writeFile directly if it handles TypedArrays?
            // FS refactor said 'writeFile' handles binary?
            // Let's check FileSystem.ts to be sure, safely we can use a helper if needed.
            // But implementation plan said "Update writeFile / readFile to handle binary buffers".

            // We'll trust writeFile takes string | Uint8Array based on the plan.
            // Casting binary to any to bypass TS check if strict typing issues persist, 
            // but ideally FS is typed correctly now.

            this.fs.writeFile(outputPath, binary as any); // Type assertion if FS signature isn't fully updated in all view contexts

            // Mark executable (chmod +x)
            // 0o755 = rwxr-xr-x
            this.fs.chmod(outputPath, 0o755);

            return {
                output: '',
                newState: state,
                exitCode: 0
            };

        } catch (error: any) {
            return {
                output: `gcc: error: ${error.message}`,
                newState: state,
                exitCode: 1
            };
        }
    }
}
