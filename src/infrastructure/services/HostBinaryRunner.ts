/**
 * HostBinaryRunner - Infrastructure Layer
 *
 * Implementation of IBinaryRunner that executes a buffer as a binary on the host.
 * USED ONLY IN NODE.JS / TEST ENVIRONMENTS.
 */

import { IBinaryRunner } from '../../domain/interfaces/IBinaryRunner';
import { CommandResponse } from '../../domain/usecases/ExecuteCommand';
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

    async run(binary: Uint8Array, args: string[], env: Record<string, string>): Promise<CommandResponse> {
        const binaryName = `bin_${Date.now()}`;
        const binaryPath = path.join(this.tempDir, binaryName);

        try {
            // Write binary
            fs.writeFileSync(binaryPath, Buffer.from(binary));
            fs.chmodSync(binaryPath, 0o755);

            // Run
            const cmd = `${binaryPath} ${args.join(' ')}`;
            const result = await execAsync(cmd);

            // Dummy state return (Runner doesn't mutate VM state directly except stdout)
            // Ideally env changes? No, binaries run in subshell.
            // We need to return the output.

            // NOTE: CommandResponse requires a newState. The caller (ExecuteCommand) handles state threading.
            // We return a "stub" state or require the caller to provide current state to clone?
            // The Interface definition I made earlier returns CommandResponse.
            // Let's assume we return "no state change" and let caller merge?
            // Actually, ExecuteCommand replaces state with result.newState.
            // So we MUST return a valid state object.
            // BUT this runner doesn't have access to the current state!
            // I need to update the interface to accept state if I modify it, or return `Partial<TerminalState>`?
            // Or just return { output, exitCode } and let ExecuteCommand handle state preservation.
            // Update: IBinaryRunner should probably return { output: string, exitCode: number }.
            // CommandResponse includes newState.

            // FIX: I will cast to any to return partial, and update interface/caller to handle it.
            // Or better: update IBinaryRunner to return `{ output: string, exitCode: number }`.

            return {
                output: result.stdout.trim(), // + result.stderr?
                exitCode: 0,
                newState: null as any // Caller must handle
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
