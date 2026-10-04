import { ASTNode, NodeType } from '../interfaces/ShellAST';
import { TerminalState } from '../entities/TerminalState';
import { FileSystemService } from './FileSystemService';
import { CommandRegistry } from '../commands/CommandRegistry';
import { JobControlService } from './JobControlService';
import { IShellExecutor } from '../interfaces/IShellExecutor';
import { NetworkMap } from './NetworkMap';
import { SimulationBus } from './SimulationBus';
import { ShellParser } from './ShellParser';
import { GlobService } from './GlobService';
import { NodeExecutor } from './shell/NodeExecutor';
import { CommandDescription, ShellResult, ShellRuntime, withStatus } from './shell/ShellRuntime';
import { IOContext } from './shell/io/IOContext';
import { BufferSink } from './shell/io/OutputSink';
import { Redirector } from './shell/io/Redirector';
import { ExpansionScope, WordExpander } from './shell/expansion/WordExpander';
import { exportedEnvironment, getOption } from './shell/expansion/ShellVariables';
import { BuiltinRegistry, createDefaultBuiltins, isKeyword } from './shell/builtins';
import { CommandResolver } from './shell/CommandResolver';
import { UtilityRunner } from './shell/UtilityRunner';
import { ExecutableFormat, ProgramLoader } from './shell/ProgramLoader';
import { ShellSyntaxError } from './shell/ShellSyntaxError';

import { CommandExecutor } from './shell/executors/CommandExecutor';
import { ListExecutor } from './shell/executors/ListExecutor';
import { AsyncExecutor } from './shell/executors/AsyncExecutor';
import { PipelineExecutor } from './shell/executors/PipelineExecutor';
import { ControlFlowExecutor } from './shell/executors/ControlFlowExecutor';
import { SubshellExecutor } from './shell/executors/SubshellExecutor';
import { FunctionDefExecutor } from './shell/executors/FunctionDefExecutor';
import { BlockExecutor } from './shell/executors/BlockExecutor';
import { RedirectedExecutor } from './shell/executors/RedirectedExecutor';

/** Abort threshold for a single top-level command line (runaway scripts). */
export const MAX_STEPS = 250000;

export class ExecutionLimitExceeded extends Error {
    constructor() {
        super('execution step limit exceeded');
        this.name = 'ExecutionLimitExceeded';
    }
}

export interface ShellInterpreterOptions {
    fsService: FileSystemService;
    registry: CommandRegistry;
    jobControl: JobControlService;
    builtins?: BuiltinRegistry;
    executorFactory?: () => IShellExecutor;
    networkMap?: NetworkMap;
    bus?: SimulationBus;
    formats?: ExecutableFormat[];
    /** Home directory lookup for `~user` (backed by /etc/passwd). */
    homeOf?: (user: string) => string | undefined;
}

/**
 * ShellInterpreter - the POSIX shell's execution engine (Visitor over the AST).
 *
 * Owns the shared runtime services and dispatches each node type to its
 * NodeExecutor strategy (OCP). Also provides eval/source, child shells and
 * command substitution to builtins and the expander.
 */
export class ShellInterpreter implements ShellRuntime {
    readonly fsService: FileSystemService;
    readonly registry: CommandRegistry;
    readonly jobControl: JobControlService;
    readonly expander: WordExpander;
    readonly redirector: Redirector;
    readonly builtins: BuiltinRegistry;
    conditionDepth = 0;

    private parser = new ShellParser();
    private handlers = new Map<NodeType, NodeExecutor>();
    private commandExecutor: CommandExecutor;
    private resolver: CommandResolver;
    private steps = 0;

    constructor(opts: ShellInterpreterOptions) {
        this.fsService = opts.fsService;
        this.registry = opts.registry;
        this.jobControl = opts.jobControl;
        this.builtins = opts.builtins ?? createDefaultBuiltins();
        this.resolver = new CommandResolver(this.fsService);

        const globber = new GlobService(this.fsService);
        this.expander = new WordExpander({
            runCommandSubstitution: (script, state, io) => this.commandSubstitution(script, state, io),
            glob: (pattern, cwd) => globber.expand(pattern, cwd),
            homeOf: opts.homeOf ?? (user => (user === 'root' ? '/root' : `/home/${user}`)),
        });
        this.redirector = new Redirector(this.fsService, this.expander);

        const utilities = new UtilityRunner(this, opts.executorFactory, opts.networkMap);
        const loader = new ProgramLoader(this, this.fsService, this.registry, utilities, opts.formats);
        this.commandExecutor = new CommandExecutor(this, this.builtins, utilities, loader, opts.bus);

        const flow = new ControlFlowExecutor(this);
        this.handlers.set(NodeType.COMMAND, this.commandExecutor);
        this.handlers.set(NodeType.LIST, new ListExecutor(this));
        this.handlers.set(NodeType.ASYNC, new AsyncExecutor(this));
        this.handlers.set(NodeType.PIPELINE, new PipelineExecutor(this));
        this.handlers.set(NodeType.IF, flow);
        this.handlers.set(NodeType.FOR, flow);
        this.handlers.set(NodeType.WHILE, flow);
        this.handlers.set(NodeType.CASE, flow);
        this.handlers.set(NodeType.SUBSHELL, new SubshellExecutor(this));
        this.handlers.set(NodeType.FUNCTION_DEF, new FunctionDefExecutor());
        this.handlers.set(NodeType.BLOCK, new BlockExecutor(this));
        this.handlers.set(NodeType.REDIRECTED, new RedirectedExecutor(this));
    }

    /** Resets per-command-line accounting (called by the top-level executor). */
    beginCommandLine(): void {
        this.steps = 0;
        this.conditionDepth = 0;
    }

    visit = async (node: ASTNode, state: TerminalState, io: IOContext): Promise<ShellResult> => {
        if (++this.steps > MAX_STEPS) throw new ExecutionLimitExceeded();
        if (getOption(state, 'noexec') && node.type === NodeType.COMMAND) return { status: 0, state };

        const executor = this.handlers.get(node.type);
        if (!executor) throw new Error(`Unknown AST node type: ${node.type}`);
        const result = await executor.execute(node, state, io);

        // set -e: an untested failing command exits the shell.
        if (result.errexitEligible && result.status !== 0 && !result.flow &&
            this.conditionDepth === 0 && getOption(result.state, 'errexit')) {
            return { ...result, flow: { kind: 'exit' } };
        }
        return result;
    };

    parse(source: string, state: TerminalState): ASTNode | null {
        return this.parser.parse(source, state.aliases ?? {});
    }

    /**
     * Reads and executes a program one complete command at a time, so that
     * aliases (and syntax errors) take effect in order, like a real shell.
     */
    async runSource(source: string, state: TerminalState, io: IOContext): Promise<ShellResult> {
        const parser = new ShellParser();
        let result: ShellResult = { status: 0, state: { ...state, lastExitCode: 0 } };
        let ran = false;
        try {
            parser.begin(source);
            while (true) {
                const ast = parser.parseNext(result.state.aliases ?? {});
                if (ast === undefined) break;
                result = withStatus(await this.visit(ast, ran ? result.state : state, io));
                ran = true;
                if (result.flow) break;
            }
        } catch (e: any) {
            if (!(e instanceof ShellSyntaxError)) throw e;
            io.stderr.write(`sh: syntax error: ${e.message}\n`);
            return { status: 2, state: { ...result.state, lastExitCode: 2 } };
        }
        return result;
    }

    async runChildShell(source: string, args: string[], name: string, state: TerminalState, io: IOContext): Promise<ShellResult> {
        const environment = exportedEnvironment(state);
        const child: TerminalState = {
            ...state,
            environment,
            exportedVars: Object.keys(environment),
            readonlyVars: [],
            aliases: {},
            functions: new Map(),
            traps: new Map(),
            positionalParams: args,
            scriptName: name,
            shellOptions: {},
            callStackDepth: 0,
            localFrames: [],
            lastExitCode: 0,
        };
        const savedDepth = this.conditionDepth;
        this.conditionDepth = 0;
        try {
            let res = await this.runSource(source, child, io);
            const exitTrap = res.state.traps?.get('EXIT');
            if (exitTrap) {
                const trapRes = await this.runSource(exitTrap, { ...res.state, traps: new Map() }, io);
                if (trapRes.flow?.kind === 'exit') res = { ...res, status: trapRes.status };
            }
            return { status: res.status, state };
        } finally {
            this.conditionDepth = savedDepth;
        }
    }

    async invoke(name: string, args: string[], state: TerminalState, io: IOContext, opts: { skipFunctions?: boolean } = {}): Promise<ShellResult> {
        return this.commandExecutor.dispatch(name, args, [], state, io, opts.skipFunctions);
    }

    describeCommand(name: string, state: TerminalState): CommandDescription {
        if (state.aliases?.[name] !== undefined) return { kind: 'alias', value: state.aliases[name] };
        if (isKeyword(name)) return { kind: 'keyword' };
        const builtin = this.builtins.get(name);
        if (builtin?.special) return { kind: 'special-builtin' };
        if (state.functions?.has(name)) return { kind: 'function' };
        if (builtin) return { kind: 'builtin' };
        const resolved = this.resolver.resolve(name, state);
        if (resolved.kind === 'file') return { kind: 'file', path: resolved.path };
        if (!name.includes('/') && this.registry.get(name)) return { kind: 'file', path: `/usr/bin/${name}` };
        return { kind: 'not-found' };
    }

    newScope(state: TerminalState, io?: IOContext): ExpansionScope {
        return { state, io };
    }

    /** Builtin and utility names, for completion and `compgen`-like listings. */
    commandNames(): string[] {
        return Array.from(new Set([...this.builtins.names(), ...this.registry.getCommandNames()])).sort();
    }

    private async commandSubstitution(script: string, state: TerminalState, io?: IOContext): Promise<{ stdout: string; status: number }> {
        const sink = new BufferSink();
        const subIo = io ? io.withStdout(sink) : IOContext.create(undefined, sink, new BufferSink());
        const savedDepth = this.conditionDepth;
        try {
            const res = await this.runSource(script, { ...state, traps: new Map() }, subIo);
            return { stdout: sink.contents(), status: res.status };
        } finally {
            this.conditionDepth = savedDepth;
        }
    }
}
