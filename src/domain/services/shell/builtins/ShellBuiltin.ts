import { TerminalState } from '../../../entities/TerminalState';
import { IOContext } from '../io/IOContext';
import { ControlFlow, ShellEffects, ShellRuntime } from '../ShellRuntime';

/**
 * Shell builtins: utilities that must run inside the shell process because
 * they read or change the shell's own state (variables, options, cwd,
 * positional parameters, control flow).
 */
export interface BuiltinContext {
    name: string;
    args: string[];
    state: TerminalState;
    io: IOContext;
    runtime: ShellRuntime;
}

export interface BuiltinResult {
    status: number;
    state?: TerminalState;
    flow?: ControlFlow;
    effects?: ShellEffects;
}

export interface ShellBuiltin {
    readonly names: string[];
    /** POSIX special builtins (XCU §2.14): found before functions; assignments persist. */
    readonly special: boolean;
    /** Also an installed program (e.g. /usr/bin/sh): `type` reports its path. */
    readonly external?: boolean;
    run(ctx: BuiltinContext): Promise<BuiltinResult> | BuiltinResult;
}

/** Writes "name: message" to stderr and returns the status. */
export function fail(ctx: BuiltinContext, message: string, status = 1): BuiltinResult {
    ctx.io.stderr.write(`${ctx.name}: ${message}\n`);
    return { status };
}

export function out(ctx: BuiltinContext, text: string): void {
    ctx.io.stdout.write(text);
}

/** Quotes a value so the shell would read it back verbatim. */
export function shellQuote(value: string): string {
    if (value !== '' && /^[A-Za-z0-9_@%+=:,./-]+$/.test(value)) return value;
    return `'${value.replace(/'/g, `'\\''`)}'`;
}

export class BuiltinRegistry {
    private builtins = new Map<string, ShellBuiltin>();

    register(builtin: ShellBuiltin): this {
        for (const name of builtin.names) this.builtins.set(name, builtin);
        return this;
    }

    get(name: string): ShellBuiltin | undefined {
        return this.builtins.get(name);
    }

    names(): string[] {
        return Array.from(this.builtins.keys());
    }
}
