import { NodeExecutor } from '../NodeExecutor';
import { ASTNode, CommandNode, FunctionDefNode } from '../../../interfaces/ShellAST';
import { TerminalState } from '../../../entities/TerminalState';
import { IOContext } from '../io/IOContext';
import { ShellResult, ShellRuntime } from '../ShellRuntime';
import { ExpansionError, ExpansionScope } from '../expansion/WordExpander';
import { RedirectionError } from '../io/Redirector';
import {
    exportedEnvironment, getOption, ReadonlyVariableError, setVariable
} from '../expansion/ShellVariables';
import { BuiltinRegistry, ShellBuiltin } from '../builtins/ShellBuiltin';
import { CommandResolver } from '../CommandResolver';
import { UtilityRunner } from '../UtilityRunner';
import { ProgramLoader } from '../ProgramLoader';
import { SimulationBus, GameEventType, CommandExecutedPayload } from '../../SimulationBus';

type Assignment = [name: string, value: string];

/**
 * CommandExecutor - simple commands (XCU §2.9.1).
 *
 * Expansion order: words, then redirections, then assignments. Lookup
 * order: special builtins, functions, regular builtins, PATH search
 * (with the utility registry as a last-resort fallback).
 */
export class CommandExecutor implements NodeExecutor {
    private resolver: CommandResolver;

    constructor(
        private runtime: ShellRuntime,
        private builtins: BuiltinRegistry,
        private utilities: UtilityRunner,
        private loader: ProgramLoader,
        private bus?: SimulationBus
    ) {
        this.resolver = new CommandResolver(runtime.fsService);
    }

    async execute(node: ASTNode, state: TerminalState, io: IOContext): Promise<ShellResult> {
        const cmd = node as CommandNode;
        const scope = this.runtime.newScope(state, io);

        let fields: string[];
        let cmdIo: IOContext;
        const assignments: Assignment[] = [];
        try {
            const words = cmd.command === '' ? cmd.args : [cmd.command, ...cmd.args];
            fields = await this.runtime.expander.expandWords(words, scope);
            cmdIo = await this.runtime.redirector.apply(cmd.redirects, scope, io);
            for (const a of cmd.assignments) {
                const eq = a.indexOf('=');
                assignments.push([a.substring(0, eq), await this.runtime.expander.expandAssignmentValue(a.substring(eq + 1), scope)]);
            }
        } catch (e: any) {
            return this.failure(e, scope.state, io);
        }
        state = scope.state;

        if (getOption(state, 'xtrace')) {
            const ps4 = state.environment.PS4 ?? '+ ';
            io.stderr.write(ps4 + [...assignments.map(([n, v]) => `${n}=${v}`), ...fields].join(' ') + '\n');
        }

        if (fields.length === 0) {
            try {
                for (const [name, value] of assignments) state = setVariable(state, name, value);
            } catch (e: any) {
                return this.failure(e, state, io);
            }
            const status = scope.lastSubstitutionStatus ?? 0;
            return { status, state: { ...state, lastExitCode: status } };
        }

        const [name, ...args] = fields;
        const result = await this.dispatch(name, args, assignments, state, cmdIo);
        return { ...result, errexitEligible: result.status !== 0, state: { ...result.state, lastExitCode: result.status } };
    }

    /** Command search and execution for an already-expanded command. */
    async dispatch(name: string, args: string[], assignments: Assignment[], state: TerminalState, io: IOContext, skipFunctions = false): Promise<ShellResult> {
        const builtin = this.builtins.get(name);

        if (builtin?.special) {
            try {
                for (const [n, v] of assignments) state = setVariable(state, n, v);
            } catch (e: any) {
                return this.failure(e, state, io);
            }
            return this.runBuiltin(builtin, name, args, state, io);
        }

        const fn = skipFunctions ? undefined : state.functions?.get(name) as FunctionDefNode | undefined;
        if (fn) return this.withTemporaryAssignments(assignments, state, s => this.runFunction(fn, args, s, io));

        if (builtin) return this.withTemporaryAssignments(assignments, state, s => this.runBuiltin(builtin, name, args, s, io));

        return this.withTemporaryAssignments(assignments, state, s => this.runExternal(name, args, assignments, s, io));
    }

    private async runBuiltin(builtin: ShellBuiltin, name: string, args: string[], state: TerminalState, io: IOContext): Promise<ShellResult> {
        try {
            const r = await builtin.run({ name, args, state, io, runtime: this.runtime });
            return { status: r.status, state: r.state ?? state, flow: r.flow, effects: r.effects };
        } catch (e: any) {
            return this.failure(e, state, io, name);
        }
    }

    private async runFunction(fn: FunctionDefNode, args: string[], state: TerminalState, io: IOContext): Promise<ShellResult> {
        const depth = state.callStackDepth || 0;
        if (depth > 200) {
            io.stderr.write(`sh: ${fn.name}: maximum function nesting level exceeded\n`);
            return { status: 2, state };
        }
        const callerParams = state.positionalParams;
        const frames = state.localFrames ?? [];
        const res = await this.runtime.visit(fn.body, {
            ...state, positionalParams: args, callStackDepth: depth + 1, localFrames: [...frames, {}],
        }, io);
        const flow = res.flow?.kind === 'exit' ? res.flow : undefined;

        // Restore variables declared `local` in this call.
        const environment = { ...res.state.environment };
        const frame = res.state.localFrames?.[frames.length] ?? {};
        for (const [name, saved] of Object.entries(frame)) {
            if (saved === null) delete environment[name];
            else environment[name] = saved;
        }
        return {
            ...res,
            flow,
            state: { ...res.state, environment, positionalParams: callerParams, callStackDepth: depth, localFrames: frames },
        };
    }

    private async runExternal(name: string, args: string[], assignments: Assignment[], state: TerminalState, io: IOContext): Promise<ShellResult> {
        const resolved = this.resolver.resolve(name, state);
        const env = { ...exportedEnvironment(state) };
        for (const [n, v] of assignments) env[n] = v;

        if (resolved.kind === 'file') {
            // /usr/bin/sh, /usr/bin/cd, ...: executables for utilities the shell implements itself.
            const asBuiltin = resolved.utility ? this.builtins.get(resolved.utility) : undefined;
            if (asBuiltin && !asBuiltin.special) return this.runBuiltin(asBuiltin, resolved.utility!, args, state, io);
            const utility = resolved.utility ? this.runtime.registry.get(resolved.utility) : undefined;
            if (utility) return this.runUtility(resolved.utility!, args, env, state, io);
            return this.loader.exec(resolved.path, name, args, state, io);
        }

        // Registry fallback keeps utilities reachable even if /bin was damaged.
        if (!name.includes('/') && this.runtime.registry.get(name)) {
            return this.runUtility(name, args, env, state, io);
        }

        switch (resolved.kind) {
            case 'not-executable':
                io.stderr.write(`sh: ${name}: Permission denied\n`);
                return { status: 126, state };
            case 'is-directory':
                io.stderr.write(`sh: ${name}: Is a directory\n`);
                return { status: 126, state };
            default:
                io.stderr.write(name.includes('/') ? `sh: ${name}: No such file or directory\n` : `sh: ${name}: not found\n`);
                this.emit(name, args, 127, '', state.currentDirectory);
                return { status: 127, state };
        }
    }

    private async runUtility(name: string, args: string[], env: Record<string, string>, state: TerminalState, io: IOContext): Promise<ShellResult> {
        const command = this.runtime.registry.get(name)!;
        try {
            const { result, response } = await this.utilities.run(name, command, args, env, state, io);
            this.emit(name, args, result.status, (response.output ?? '') + (response.stderr ?? ''), state.currentDirectory);
            return result;
        } catch (e: any) {
            if (e?.name === 'OutputLimitExceeded') throw e;
            return this.failure(e, state, io, name);
        }
    }

    /**
     * Prefix assignments for non-special commands affect only that command:
     * apply them, run, then restore the previous values.
     */
    private async withTemporaryAssignments(
        assignments: Assignment[],
        state: TerminalState,
        run: (s: TerminalState) => Promise<ShellResult>
    ): Promise<ShellResult> {
        if (assignments.length === 0) return run(state);
        const environment = { ...state.environment };
        for (const [n, v] of assignments) environment[n] = v;
        // Prefix assignments are placed in the command's environment, i.e. exported.
        const exportedVars = state.exportedVars && Array.from(new Set([...state.exportedVars, ...assignments.map(([n]) => n)]));
        const res = await run({ ...state, environment, exportedVars });

        const restored = { ...res.state.environment };
        for (const [n] of assignments) {
            if (n in state.environment) restored[n] = state.environment[n];
            else delete restored[n];
        }
        return { ...res, state: { ...res.state, environment: restored, exportedVars: state.exportedVars } };
    }

    private failure(e: any, state: TerminalState, io: IOContext, name = 'sh'): ShellResult {
        if (e?.name === 'OutputLimitExceeded') throw e;
        const message = e?.message ?? String(e);
        if (e instanceof ExpansionError) {
            io.stderr.write(`sh: ${message}\n`);
            return { status: e.status, state, errexitEligible: true };
        }
        if (e instanceof RedirectionError || e instanceof ReadonlyVariableError) {
            io.stderr.write(`sh: ${message}\n`);
            // dash reports redirection and readonly failures with status 2.
            return { status: 2, state, errexitEligible: true };
        }
        io.stderr.write(`${name}: ${message}\n`);
        return { status: 1, state, errexitEligible: true };
    }

    private emit(command: string, args: string[], exitCode: number, output: string, cwd: string) {
        if (!this.bus) return;
        const payload: CommandExecutedPayload = { command, args, exitCode, output, cwd };
        this.bus.emit(GameEventType.COMMAND_EXECUTED, payload);
    }
}
