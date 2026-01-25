import { getStdinAsString } from '../../entities/ProcessContext';
/**
 * C17Command - Core Utility
 *
 * The POSIX 'c17' utility interface.
 * Orchestrates compilation by delegating to an ICompilerService.
 */

import { ICommand } from '../ICommand';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { ICompilerService, CompilerOptions } from '../../interfaces/ICompilerService';
import { FileSystemService } from '../../services/FileSystemService';

export class C17Command implements ICommand {
    constructor(private compilerService: ICompilerService, private fs: FileSystemService) { }

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        const input = getStdinAsString(context);
        let outputName = 'a.out';
        let compileOnly = false;
        let preprocessOnly = false;
        let debug = false;
        let strip = false;
        let sharedLibrary = false;
        let optimizationLevel: string | undefined;
        const sourceFiles: string[] = [];
        const linkLibraries: string[] = [];
        const defines: Record<string, string> = {};
        const undefines: string[] = [];
        const includePaths: string[] = [];
        const librarySearchPaths: string[] = [];

        // 1. Argument Parsing
        for (let i = 0; i < args.length; i++) {
            const arg = args[i];

            if (arg === '-c') {
                compileOnly = true;
            } else if (arg === '-E') {
                preprocessOnly = true;
            } else if (arg === '-g') {
                debug = true;
            } else if (arg === '-s') {
                strip = true;
            } else if (arg === '-G') {
                sharedLibrary = true;
            } else if (arg === '-o') {
                if (i + 1 >= args.length) return { output: 'c17: option requires an argument -- o', newState: state, exitCode: 1 };
                outputName = args[++i];
            } else if (arg.startsWith('-D')) {
                let def = arg.substring(2);
                if (def.length === 0) {
                    if (i + 1 >= args.length) return { output: 'c17: option requires an argument -- D', newState: state, exitCode: 1 };
                    def = args[++i];
                }
                const parts = def.split('=');
                defines[parts[0]] = parts[1] || '1';
            } else if (arg.startsWith('-U')) {
                let name = arg.substring(2);
                if (name.length === 0) {
                    if (i + 1 >= args.length) return { output: 'c17: option requires an argument -- U', newState: state, exitCode: 1 };
                    name = args[++i];
                }
                undefines.push(name);
            } else if (arg.startsWith('-I')) {
                let path = arg.substring(2);
                if (path.length === 0) {
                    if (i + 1 >= args.length) return { output: 'c17: option requires an argument -- I', newState: state, exitCode: 1 };
                    path = args[++i];
                }
                includePaths.push(path);
            } else if (arg.startsWith('-L')) {
                let path = arg.substring(2);
                if (path.length === 0) {
                    if (i + 1 >= args.length) return { output: 'c17: option requires an argument -- L', newState: state, exitCode: 1 };
                    path = args[++i];
                }
                librarySearchPaths.push(path);
            } else if (arg.startsWith('-l')) {
                let lib = arg.substring(2);
                if (lib.length === 0) {
                    if (i + 1 >= args.length) return { output: 'c17: option requires an argument -- l', newState: state, exitCode: 1 };
                    lib = args[++i];
                }
                linkLibraries.push(lib);
            } else if (arg.startsWith('-O')) {
                optimizationLevel = arg.substring(2) || '1'; // Default -O implies level 1 if not specified? POSIX says unspecified.
            } else if (arg.startsWith('-')) {
                // Ignore unknown flags or return error
                // POSIX says "The standard utilities shall accept... options".
                // If it's unknown, we should probably warn or error. For now, strict error?
                // Actually, let's allow it to pass through or ignore to be safe unless we want strict compliance.
                // Strict compliance: error.
                return { output: `c17: illegal option -- ${arg}`, newState: state, exitCode: 1 };
            } else {
                sourceFiles.push(arg);
            }
        }

        if (sourceFiles.length === 0) {
            return { output: 'c17: no input files', newState: state, exitCode: 1 };
        }

        // Adjust default output name if -c and no -o provided
        if (compileOnly && outputName === 'a.out' && sourceFiles.length === 1) {
            const src = sourceFiles[0];
            const base = src.substring(src.lastIndexOf('/') + 1);
            const name = base.substring(0, base.lastIndexOf('.'));
            outputName = name + '.o';
        }

        try {
            // 2. Read Source Files
            const fileContents: string[] = [];
            for (const src of sourceFiles) {
                // Resolve path using FS
                const dentry = this.fs.resolve(src, state.currentDirectory);
                if (!dentry) {
                    return { output: `c17: ${src}: No such file or directory`, newState: state, exitCode: 1 };
                }
                const inode = this.fs.getInode(dentry.inodeId);
                // Ensure text file check... Skipped for brevity, assuming text.

                // Convert buffer to string if needed
                let content = inode?.content;
                if (content instanceof Uint8Array) {
                    content = new TextDecoder().decode(content);
                }
                fileContents.push(content as string);
            }

            // 3. Compile
            const options: CompilerOptions = {
                outputFile: outputName,
                compileOnly,
                preprocessOnly,
                debug,
                strip,
                sharedLibrary,
                optimizationLevel,
                defines,
                undefines,
                includePaths,
                librarySearchPaths,
                linkLibraries,
                cwd: state.currentDirectory
            };

            const binary = await this.compilerService.compile(fileContents, options);

            // 4. Write Output
            // Determine absolute path for output
            this.fs.writeFile(outputName, binary, 'w', state.user.uid, state.user.gid, state.currentDirectory);

            // 5. Set Executable (unless -c or -E)
            if (!compileOnly && !preprocessOnly && !sharedLibrary) {
                this.fs.chmod(outputName, 0o755, state.currentDirectory);
            }

            return { output: '', newState: state, exitCode: 0 };

        } catch (error: any) {
            return { output: `c17: error: ${error.message}`, newState: state, exitCode: 1 };
        }
    }
}
