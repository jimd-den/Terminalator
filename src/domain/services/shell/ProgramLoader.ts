import { TerminalState } from '../../entities/TerminalState';
import { FileSystemService } from '../FileSystemService';
import { CommandRegistry } from '../../commands/CommandRegistry';
import { IOContext } from './io/IOContext';
import { ShellResult, ShellRuntime } from './ShellRuntime';
import { exportedEnvironment } from './expansion/ShellVariables';
import { UtilityRunner } from './UtilityRunner';
import { UTILITY_STUB_PREFIX } from './CommandResolver';

/**
 * An executable file format (ELF/WASM binaries, RISC-V artifacts, ...).
 * Formats are injected from the use-case layer, keeping this service free
 * of outer-layer dependencies (DIP) and open for new formats (OCP).
 */
export interface ExecutableFormat {
    readonly name: string;
    matches(content: Uint8Array, text: string): boolean;
    run(content: Uint8Array, text: string, args: string[], state: TerminalState, io: IOContext): Promise<{ status: number; stdout: string; stderr?: string }>;
}

/** Shells that can run a `#!` script in-process. */
const SHELLS = new Set(['sh', 'bash', 'dash', 'ash', 'ksh', 'zsh']);

/**
 * ProgramLoader - the "exec" step: turns a file into a running program.
 *
 *   #!interp [arg]  → interpreter utility with the script path appended
 *   other text      → POSIX shell script in a child shell
 *   known formats   → injected ExecutableFormat handlers
 */
export class ProgramLoader {
    constructor(
        private runtime: ShellRuntime,
        private fs: FileSystemService,
        private registry: CommandRegistry,
        private utilities: UtilityRunner,
        private formats: ExecutableFormat[] = []
    ) { }

    async exec(path: string, invokedAs: string, args: string[], state: TerminalState, io: IOContext): Promise<ShellResult> {
        let content: Uint8Array;
        let text: string;
        try {
            content = this.fs.readFileBuffer(path, '/', state.user);
            text = this.fs.readFile(path, '/', state.user);
        } catch {
            io.stderr.write(`sh: ${invokedAs}: Permission denied\n`);
            return { status: 126, state };
        }

        if (text.startsWith(UTILITY_STUB_PREFIX)) {
            const utility = text.substring(UTILITY_STUB_PREFIX.length).split('\n')[0].trim();
            return this.runUtility(utility, args, state, io, invokedAs);
        }

        for (const format of this.formats) {
            if (!format.matches(content, text)) continue;
            try {
                const res = await format.run(content, text, args, state, io);
                io.stdout.write(res.stdout);
                if (res.stderr) io.stderr.write(res.stderr);
                return { status: res.status, state };
            } catch (e: any) {
                io.stderr.write(`sh: ${invokedAs}: ${e?.message ?? e}\n`);
                return { status: 126, state };
            }
        }

        if (this.isBinary(content)) {
            io.stderr.write(`sh: ${invokedAs}: cannot execute binary file: Exec format error\n`);
            return { status: 126, state };
        }

        if (text.startsWith('#!')) {
            const line = text.substring(2).split('\n')[0].trim();
            let [interp, ...interpArgs] = line.split(/\s+/);
            let base = interp.split('/').pop() ?? interp;
            if (base === 'env' && interpArgs.length > 0) {
                base = interpArgs.shift()!;
            }
            if (!SHELLS.has(base)) {
                if (this.registry.get(base)) {
                    return this.runUtility(base, [...interpArgs, path, ...args], state, io, invokedAs);
                }
                io.stderr.write(`sh: ${invokedAs}: ${interp}: bad interpreter: No such file or directory\n`);
                return { status: 126, state };
            }
        }

        const res = await this.runtime.runChildShell(text, args, invokedAs, state, io);
        return { status: res.status, state };
    }

    private async runUtility(name: string, args: string[], state: TerminalState, io: IOContext, invokedAs: string): Promise<ShellResult> {
        const command = this.registry.get(name);
        if (!command) {
            io.stderr.write(`sh: ${invokedAs}: not found\n`);
            return { status: 127, state };
        }
        const { result } = await this.utilities.run(name, command, args, exportedEnvironment(state), state, io);
        return result;
    }

    private isBinary(content: Uint8Array): boolean {
        const n = Math.min(content.length, 512);
        for (let i = 0; i < n; i++) if (content[i] === 0) return true;
        return false;
    }
}
