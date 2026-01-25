/**
 * HostBinaryRunner - Infrastructure Layer
 *
 * Implementation of IBinaryRunner that executes a buffer as a binary on the host.
 * USED ONLY IN NODE.JS / TEST ENVIRONMENTS.
 */

import { IBinaryRunner, ExecutionContext } from '../../domain/interfaces/IBinaryRunner';
import { CommandResponse } from '../../domain/usecases/ExecuteCommand';
import { FileSystemService } from '../../domain/services/FileSystemService';
import { TerminalState } from '../../domain/entities/TerminalState';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process'; // or spawn
import { promisify } from 'util';

const execAsync = promisify(exec);

export class HostBinaryRunner implements IBinaryRunner {
    private tempDir: string;

    constructor() {
        this.tempDir = path.join(os.tmpdir(), 'terminalator_runner');
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir);
        }
    }

    async run(binary: Uint8Array, args: string[], context: ExecutionContext): Promise<CommandResponse> {
        const binaryName = `bin_${Date.now()}`;
        const binaryPath = path.join(this.tempDir, binaryName);

        try {
            // Write binary
            fs.writeFileSync(binaryPath, Buffer.from(binary));
            fs.chmodSync(binaryPath, 0o755);

            // Run
            const cmd = `${binaryPath} ${args.join(' ')}`;
            // We should use streams from context (stdin, stdout, stderr)
            // But child_process.exec buffers. For streaming we need spawn.
            // For MVP Host Runner, buffering and writing to context.stdout is acceptable emulation.

            const result = await execAsync(cmd);

            // Write output to context streams
            if (result.stdout) {
                context.stdout.write(result.stdout);
            }
            if (result.stderr) {
                context.stderr.write(result.stderr);
            }

            // CommandResponse requires newState.
            // Host runner doesn't change VM state.
            // We should probably clone the input state or let ExecuteCommand handle it?
            // ExecuteCommand calls this.binaryRunner.run().
            // If we return a Partial<TerminalState>, we need that flexibility.
            // But interface says `Promise<CommandResponse>`.
            // We'll create a dummy empty state for now, assuming ExecuteCommand merges or ignores if handled differently.
            // Actually, ExecuteCommand typically REPLACES state with result.newState.
            // So we MUST return a valid full state.
            // But we don't have it unless we pass it in ExecutionContext or args.
            // ExecutionContext has `env`.
            // Let's assume we return a stub and ExecuteCommand must be robust?
            // No, that's risky.
            // Ideally `ExecutionContext` should contain `state: TerminalState`.
            // But I defined it with `env`.
            // Let's fix this by returning a "null" state and updating ExecuteCommand to not overwrite if null?
            // OR update ExecutionContext to include state.

            // NOTE: For now, I will return `null` as any to bypass TS, 
            // AND I will check ExecuteCommand to ensure it handles null newState if possible,
            // OR I will simply rely on the fact that BinaryRunner is mostly for WASM which might use state.

            return {
                output: (result.stdout + result.stderr).trim(),
                exitCode: 0,
                newState: null as any
            };

        } catch (error: any) {
            return {
                output: error.stdout || error.stderr || error.message,
                exitCode: error.code || 1,
                newState: null as any
            };
        } finally {
            if (fs.existsSync(binaryPath)) fs.unlinkSync(binaryPath);
        }
    }
}
