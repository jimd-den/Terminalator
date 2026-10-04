import { ICommand } from '../../commands/ICommand';
import { CommandResponse } from '../../entities/Command';
import { ProcessContext } from '../../entities/ProcessContext';
import { StringStream } from '../../entities/Stream';
import { TerminalState } from '../../entities/TerminalState';
import { IShellExecutor } from '../../interfaces/IShellExecutor';
import { NetworkMap } from '../NetworkMap';
import { IOContext, inputFromString, isTty } from './io/IOContext';
import { processTableFor } from '../../entities/ProcessTable';
import { binaryStringToBytes, bytesToStreamText } from './io/OutputSink';
import { ShellResult } from './ShellRuntime';
import { ShellRuntime } from './ShellRuntime';

/**
 * Utilities whose stdout must be passed through byte-exact (no newline
 * normalisation), because they reproduce or generate exact data.
 */
const EXACT_OUTPUT = new Set([
    'printf', 'echo', 'cat', 'tr', 'dd', 'head', 'tail', 'tee', 'sed', 'awk', 'cut', 'paste',
    'od', 'base64', 'rev', 'tac', 'xxd', 'uuencode', 'uudecode', 'compress', 'uncompress', 'zcat',
    'gzip', 'gunzip', 'iconv', 'fold', 'expand', 'unexpand', 'nl', 'pr', 'asa', 'm4', 'xargs', 'yes', 'seq',
]);

/**
 * UtilityRunner - Adapter between the shell's fd-based I/O and the
 * ICommand contract used by registry utilities.
 *
 * - stdin is the shared stream of fd 0; the legacy string view is lazy so
 *   that utilities which never read input do not drain a `while read` loop.
 * - Whatever the utility writes to its stdout/stderr streams, plus its
 *   returned `output`, is forwarded to fds 1 and 2. Diagnostics returned
 *   inside `output` (lines starting with "name:" on failure) go to stderr.
 */
export class UtilityRunner {
    constructor(
        private runtime: ShellRuntime,
        private executorFactory?: () => IShellExecutor,
        private networkMap?: NetworkMap
    ) { }

    async run(
        name: string,
        command: ICommand,
        args: string[],
        env: Record<string, string>,
        state: TerminalState,
        io: IOContext
    ): Promise<{ result: ShellResult; response: CommandResponse }> {
        const stdout = new StringStream();
        const stderr = new StringStream();
        const processes = processTableFor(this.runtime.fsService.fileSystem);
        const shellPid = state.shellPid ?? 4242;
        processes.ensureShell(shellPid, state.user);
        const proc = processes.spawn(shellPid, state.user, [name, ...args].join(' '), 'pts/0', state.niceIncrement ?? 0);
        const stdin = io.stdin;
        let legacyStdin: string | undefined;
        let legacyRead = false;

        const context: ProcessContext = {
            fs: this.runtime.fsService.fileSystem,
            // The process sees the file system through its own credentials.
            fileSystemService: this.runtime.fsService.asUser(state.user, state.umask ?? 0o022),
            env,
            cwd: state.currentDirectory,
            user: state.user,
            stdin,
            stdout,
            stderr,
            executor: this.executorFactory?.(),
            jobControl: this.runtime.jobControl,
            networkMap: this.networkMap,
            stdoutIsTty: io.isatty(1),
            argv0: name,
            pid: proc.pid,
            processes,
            spawn: async (argv, options = {}) => {
                const [child, ...childArgs] = argv;
                if (!child) return 0;
                const childEnv = options.env ?? env;
                const childState: TerminalState = {
                    ...state,
                    environment: { ...childEnv },
                    exportedVars: Object.keys(childEnv),
                    currentDirectory: options.cwd ?? state.currentDirectory,
                    niceIncrement: (state.niceIncrement ?? 0) + (options.nice ?? 0),
                };
                const childIo = options.stdin !== undefined ? io.withStdin(inputFromString(options.stdin)) : io;
                const res = await this.runtime.invoke(child, childArgs, childState, childIo, { skipFunctions: true });
                return res.status;
            },
        };
        Object.defineProperty(context, 'stdinLegacy', {
            enumerable: true,
            get: () => {
                if (!legacyRead && !isTty(stdin)) {
                    legacyRead = true;
                    const data = stdin.read();
                    legacyStdin = stdin.isClosed() || data ? (data ?? '') : undefined;
                }
                return legacyStdin;
            },
        });

        let response: CommandResponse;
        try {
            response = await command.execute(args, context, state);
        } finally {
            processes.exit(proc.pid);
        }
        const status = response.exitCode ?? 0;

        const streamed = stdout.getContents();
        if (response.binary) {
            const bytes = binaryStringToBytes(streamed + (response.output ?? ''));
            if (io.stdout.writeBytes) io.stdout.writeBytes(bytes);
            else io.stdout.write(bytesToStreamText(bytes));
            io.stderr.write(stderr.getContents() + (response.stderr ?? ''));
            return this.finish(response, state, status);
        }
        const { out, err } = command.exactOutput
            ? { out: response.output ?? '', err: '' }
            : this.route(name, response.output ?? '', status);
        io.stdout.write(streamed + out);
        io.stderr.write(stderr.getContents() + (response.stderr ?? '') + err);

        return this.finish(response, state, status);
    }

    private finish(response: CommandResponse, state: TerminalState, status: number): { result: ShellResult; response: CommandResponse } {
        const newState: TerminalState = { ...state, ...(response.newState || {}), lastExitCode: status };
        return {
            result: {
                status,
                state: newState,
                effects: {
                    uiAction: response.uiAction,
                    navigationAction: response.navigationAction,
                    metadata: response.metadata,
                    executionStats: response.executionStats,
                    utility: response.utility,
                },
            },
            response,
        };
    }

    /** Splits a legacy `output` string into stdout and stderr text. */
    private route(name: string, output: string, status: number): { out: string; err: string } {
        if (!output) return { out: '', err: '' };
        const exact = EXACT_OUTPUT.has(name);

        if (status !== 0) {
            const lines = output.replace(/\n$/, '').split('\n');
            const isDiag = (l: string) => l.startsWith(`${name}:`) || l.startsWith('sh:') || l.startsWith(`${name} `) && /error|usage/i.test(l);
            const errLines = lines.filter(isDiag);
            if (errLines.length > 0) {
                const outLines = lines.filter(l => !isDiag(l));
                return {
                    out: outLines.length ? outLines.join('\n') + '\n' : '',
                    err: errLines.join('\n') + '\n',
                };
            }
        }
        if (exact || output.endsWith('\n')) return { out: output, err: '' };
        return { out: output + '\n', err: '' };
    }
}
