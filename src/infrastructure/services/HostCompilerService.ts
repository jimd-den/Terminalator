/**
 * HostCompilerService - Infrastructure Layer
 *
 * Implementation of ICompilerService that bridges to the host's `gcc` or `clang`.
 * USED ONLY IN NODE.JS / TEST ENVIRONMENTS.
 */

import { ICompilerService, CompilerOptions } from '../../domain/interfaces/ICompilerService';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class HostCompilerService implements ICompilerService {
    private tempDir: string;

    constructor() {
        this.tempDir = path.join(os.tmpdir(), 'terminalator_compiler');
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir);
        }
    }

    async compile(sourceFiles: string[], options: CompilerOptions): Promise<Uint8Array> {
        const inputPaths: string[] = [];

        try {
            // Write source files to temp disk
            for (let i = 0; i < sourceFiles.length; i++) {
                const src = sourceFiles[i];
                const fileName = `source_${Date.now()}_${i}.c`;
                const filePath = path.join(this.tempDir, fileName);
                fs.writeFileSync(filePath, src);
                inputPaths.push(filePath);
            }

            const outputName = `out_${Date.now()}`;
            const outputPath = path.join(this.tempDir, outputName);

            // Construct GCC command
            let cmd = `gcc`;

            // Flags
            if (options.compileOnly) cmd += ' -c';
            if (options.preprocessOnly) cmd += ' -E';
            if (options.debug) cmd += ' -g';
            if (options.strip) cmd += ' -s';
            if (options.sharedLibrary) cmd += ' -shared -fPIC';
            if (options.optimizationLevel) cmd += ` -O${options.optimizationLevel}`;

            // Add inputs
            cmd += ' ' + inputPaths.join(' ');

            // Add output
            // Note: If -E is used, output usually goes to stdout, but we want it in a file for the service interface.
            // GCC supports -o even with -E.
            cmd += ` -o ${outputPath}`;

            // Definitions
            if (options.defines) {
                for (const [key, val] of Object.entries(options.defines)) {
                    cmd += ` -D${key}=${val}`;
                }
            }

            // Undefines
            if (options.undefines) {
                for (const name of options.undefines) {
                    cmd += ` -U${name}`;
                }
            }

            // Include Paths
            if (options.includePaths) {
                for (const p of options.includePaths) {
                    // Start relative paths from the temp dir logic? 
                    // No, these paths likely refer to the virtual FS if compiled in app,
                    // OR they refer to real FS if we are running in Node.
                    // For HostService, we assume paths are real paths ON THE HOST.
                    // But wait, the test suite creates files in the VIRTUAL FS.
                    // HostCompilerService writes SOURCE files from VFS to Temp Disk.
                    // But Include Paths?

                    // ISSUE: If tests assume includes are in the VFS, Host GCC won't find them unless we extract them too.
                    // For now, let's assume -I refers to system paths or the "current directory" if relative.
                    // If relative, we should potentially assume relative to the TEMP execution dir?
                    // To handle VFS includes strictly, we'd need to recursive copy everything which is hard.
                    // Assume standard system includes for now, and simple relative includes work via inputPaths logic.
                    // If the user passes `-I.`, we might need to map it.
                    cmd += ` -I${p}`;
                }
            }

            // Libraries
            if (options.librarySearchPaths) {
                for (const p of options.librarySearchPaths) {
                    cmd += ` -L${p}`;
                }
            }
            if (options.linkLibraries) {
                for (const l of options.linkLibraries) {
                    cmd += ` -l${l}`;
                }
            }
            await execAsync(cmd);

            // Read output binary
            // If -c was used, output might be .o unless specified. 
            // GCC defaults to source.o if -c used and no -o.
            // But we enforced -o above.

            if (fs.existsSync(outputPath)) {
                const buffer = fs.readFileSync(outputPath);
                return new Uint8Array(buffer);
            } else {
                throw new Error('Compilation failed: Output file not produced');
            }

        } catch (error: any) {
            throw new Error(`Compilation error: ${error.stdout || error.stderr || error.message}`);
        } finally {
            // Cleanup inputs
            // inputPaths.forEach(p => fs.unlinkSync(p));
            // Output is returned as buffer, file can be deleted
            // if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        }
    }
}
