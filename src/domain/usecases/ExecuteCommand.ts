import { FileSystem } from '../entities/FileSystem';
import { FileSystemService } from '../services/FileSystemService';
import { TerminalState } from '../entities/TerminalState';
import { TelemetryPort } from '../ports/TelemetryPort';
import { CommandRegistry } from '../commands/CommandRegistry';
import { IBinaryRunner } from '../interfaces/IBinaryRunner';
import { JobControlService } from '../services/JobControlService';
import { CommandResponse } from '../entities/Command';
import { IShellExecutor } from '../interfaces/IShellExecutor';
import { ShellInterpreter } from '../services/ShellInterpreter';
import { NetworkMap } from '../services/NetworkMap';
import { IWorldManager } from '../interfaces/IWorldManager';
import { SimulationBus } from '../services/SimulationBus';
import { IOContext, TtyInput } from '../services/shell/io/IOContext';
import { BufferSink } from '../services/shell/io/OutputSink';
import { TTY_FD } from '../services/shell/io/Redirector';
import { ShellResult } from '../services/shell/ShellRuntime';
import { IncompleteInputError, ShellSyntaxError } from '../services/shell/ShellSyntaxError';
import { getOption } from '../services/shell/expansion/ShellVariables';
import { ExecutableFormat } from '../services/shell/ProgramLoader';
import { NativeBinaryFormat, RiscvArtifactFormat } from './ExecutableFormats';
import { ASTNode } from '../interfaces/ShellAST';

export { CommandResponse };

const LOCAL_HOSTS = new Set([undefined, '', 'localhost', 'terminalator']);

/**
 * ExecuteCommand - Use Case: run one line of terminal input.
 *
 * Parses the line, runs it on the interpreter for the host the session is
 * attached to (local or an SSH target), and packages everything written to
 * the terminal (stdout and stderr, in order) into a CommandResponse.
 */
export class ExecuteCommand implements IShellExecutor {
    private registry: CommandRegistry;
    protected service: FileSystemService;
    protected fs: FileSystem;
    protected networkMap: NetworkMap;
    private jobControl = new JobControlService();
    private interpreter: ShellInterpreter;
    private remoteInterpreters = new Map<FileSystemService, ShellInterpreter>();
    private worldManager?: IWorldManager;

    constructor(
        fsOrService: FileSystem | FileSystemService,
        protected telemetry?: TelemetryPort,
        registry?: CommandRegistry,
        protected binaryRunner?: IBinaryRunner,
        networkMap?: NetworkMap,
        worldManager?: IWorldManager,
        private bus?: SimulationBus
    ) {
        if (fsOrService instanceof FileSystemService) {
            this.service = fsOrService;
            this.fs = fsOrService.fileSystem;
        } else {
            this.fs = fsOrService;
            this.service = new FileSystemService(this.fs);
        }
        this.registry = registry ?? new CommandRegistry();
        this.networkMap = networkMap ?? new NetworkMap();
        this.worldManager = worldManager;
        this.worldManager?.registerHost('terminalator', this.service);
        this.interpreter = this.createInterpreter(this.service);
    }

    getRegistry(): CommandRegistry {
        return this.registry;
    }

    /** All runnable command names (builtins + utilities), for completion. */
    getCommandNames(): string[] {
        return this.interpreter.commandNames();
    }

    private createInterpreter(fsService: FileSystemService): ShellInterpreter {
        const formats: ExecutableFormat[] = [new RiscvArtifactFormat()];
        if (this.binaryRunner) formats.push(new NativeBinaryFormat(this.binaryRunner, fsService));
        return new ShellInterpreter({
            fsService,
            registry: this.registry,
            jobControl: this.jobControl,
            executorFactory: () => this,
            networkMap: this.networkMap,
            bus: this.bus,
            formats,
            homeOf: user => this.homeOf(fsService, user),
        });
    }

    /** `~user` via /etc/passwd, falling back to the conventional location. */
    private homeOf(fs: FileSystemService, user: string): string | undefined {
        try {
            const passwd = fs.readFile('/etc/passwd');
            for (const line of passwd.split('\n')) {
                const fields = line.split(':');
                if (fields[0] === user && fields[5]) return fields[5];
            }
        } catch { /* no passwd database */ }
        return user === 'root' ? '/root' : undefined;
    }

    protected resolveInterpreter(state: TerminalState): ShellInterpreter {
        if (LOCAL_HOSTS.has(state.fsContext)) return this.interpreter;

        let remote = this.worldManager?.getHostFileSystem(state.fsContext!);
        if (!remote) {
            const legacy = this.networkMap.getSystem(state.fsContext!);
            if (legacy) remote = new FileSystemService(legacy);
        }
        if (!remote) return this.interpreter;

        this.telemetry?.info(`[ExecuteCommand] Using remote interpreter for host: ${state.fsContext}`);
        let interpreter = this.remoteInterpreters.get(remote);
        if (!interpreter) {
            interpreter = this.createInterpreter(remote);
            this.remoteInterpreters.set(remote, interpreter);
        }
        return interpreter;
    }

    async execute(input: string, state: TerminalState): Promise<CommandResponse> {
        const run = () => this.executeLine(input, state, false);
        return this.telemetry ? this.telemetry.trace('ExecuteCommand.execute', run) : run();
    }

    /**
     * Like `execute`, but keeps the streams apart: `output` is fd 1 only and
     * `stderr` is fd 2 (used by conformance tests and scripted callers).
     */
    async executeWithSeparateStreams(input: string, state: TerminalState): Promise<CommandResponse> {
        return this.executeLine(input, state, true);
    }

    private async executeLine(input: string, state: TerminalState, separate: boolean): Promise<CommandResponse> {
        if (!input.trim()) return { output: '', exitCode: 0, newState: state, command: input };

        // The interactive shell keeps the history list (used by fc and history).
        const historySize = parseInt(state.environment.HISTSIZE ?? '1000', 10) || 1000;
        state = { ...state, history: [...(state.history ?? []), input.replace(/\n+$/, '')].slice(-historySize) };

        const interpreter = this.resolveInterpreter(state);
        const terminal = new BufferSink();
        const errors = separate ? new BufferSink() : terminal;
        // Separate-stream callers capture output like a pipe would: no controlling tty.
        const base = IOContext.create(new TtyInput(), terminal, errors);
        const io = separate ? base : base.with(TTY_FD, { output: terminal });

        if (getOption(state, 'verbose')) terminal.write(input.endsWith('\n') ? input : input + '\n');

        let ast: ASTNode | null;
        try {
            ast = interpreter.parse(input, state);
        } catch (e: any) {
            if (!(e instanceof ShellSyntaxError)) throw e;
            return {
                output: `sh: syntax error: ${e.message}\n`,
                exitCode: 2,
                newState: { ...state, lastExitCode: 2 },
                command: input,
                incomplete: e instanceof IncompleteInputError,
            };
        }
        if (!ast) return { output: '', exitCode: 0, newState: state, command: input };

        interpreter.beginCommandLine();
        let res: ShellResult;
        try {
            res = await interpreter.runSource(input, state, io);
        } catch (e: any) {
            if (e?.name !== 'ExecutionLimitExceeded' && e?.name !== 'OutputLimitExceeded') throw e;
            const note = e.name === 'OutputLimitExceeded' ? 'output limit exceeded' : 'execution limit exceeded';
            return {
                output: terminal.contents() + `\nsh: ${note}; command aborted\n`,
                exitCode: 130,
                newState: { ...state, lastExitCode: 130 },
                command: input,
            };
        }

        let finalState: TerminalState = { ...res.state, lastExitCode: res.status };
        let controlFlow: CommandResponse['controlFlow'];

        if (res.flow?.kind === 'exit') {
            if (!LOCAL_HOSTS.has(state.fsContext)) {
                // Leaving an SSH session returns to the local machine.
                terminal.write(`Connection to ${state.fsContext} closed.\n`);
                finalState = {
                    ...finalState,
                    fsContext: undefined,
                    currentDirectory: '/home/operator',
                    environment: { ...finalState.environment, USER: 'operator', HOSTNAME: 'terminalator', PWD: '/home/operator' },
                };
            } else {
                controlFlow = 'EXIT';
                const trap = finalState.traps?.get('EXIT');
                if (trap) {
                    const trapRes = await interpreter.runSource(trap, { ...finalState, traps: new Map() }, io);
                    finalState = { ...trapRes.state, traps: finalState.traps, lastExitCode: res.status };
                }
            }
        }

        return {
            output: terminal.contents(),
            stderr: separate ? errors.contents() : undefined,
            binary: separate && terminal.binary ? true : undefined,
            exitCode: res.status,
            newState: finalState,
            command: input,
            controlFlow,
            uiAction: res.effects?.uiAction,
            navigationAction: res.effects?.navigationAction,
            metadata: res.effects?.metadata,
            executionStats: res.effects?.executionStats,
            utility: res.effects?.utility,
        };
    }
}
