import { ASTNode } from '../../interfaces/ShellAST';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../entities/Command';
import { IOContext } from './io/IOContext';
import { WordExpander, ExpansionScope } from './expansion/WordExpander';
import { Redirector } from './io/Redirector';
import { FileSystemService } from '../FileSystemService';
import { CommandRegistry } from '../../commands/CommandRegistry';
import { JobControlService } from '../JobControlService';

/**
 * Shared execution vocabulary for the shell interpreter (Visitor pattern):
 * every AST node executes to a ShellResult; output travels through the
 * IOContext's file descriptors, not through return values.
 */

export type ControlFlow =
    | { kind: 'break' | 'continue'; levels: number }
    | { kind: 'return' }
    | { kind: 'exit' };

/** Side-channel effects a command may request from the UI layer. */
export type ShellEffects = Pick<CommandResponse, 'uiAction' | 'navigationAction' | 'metadata' | 'executionStats' | 'utility'>;

export interface ShellResult {
    status: number;
    state: TerminalState;
    flow?: ControlFlow;
    effects?: ShellEffects;
    /** The status came from a command whose failure should trigger `set -e`. */
    errexitEligible?: boolean;
}

export type Visit = (node: ASTNode, state: TerminalState, io: IOContext) => Promise<ShellResult>;

export interface ShellRuntime {
    readonly fsService: FileSystemService;
    readonly registry: CommandRegistry;
    readonly expander: WordExpander;
    readonly redirector: Redirector;
    readonly jobControl: JobControlService;

    visit: Visit;
    /** Parses and runs source text in the current shell environment (eval, ., traps). */
    runSource(source: string, state: TerminalState, io: IOContext): Promise<ShellResult>;
    /** Runs source text in a child shell (sh -c, scripts): fresh state from exported vars. */
    runChildShell(source: string, args: string[], name: string, state: TerminalState, io: IOContext): Promise<ShellResult>;
    /** Runs a command by name, as a simple command would (used by `command`, `exec`). */
    invoke(name: string, args: string[], state: TerminalState, io: IOContext, opts?: { skipFunctions?: boolean }): Promise<ShellResult>;
    /** Number of enclosing if/while/until conditions, &&/|| left operands and `!` pipelines. */
    conditionDepth: number;
    /** Name lookup for `type` / `command -v`. */
    describeCommand(name: string, state: TerminalState): CommandDescription;
    /** All executables for `name` along PATH. */
    findInPath(name: string, state: TerminalState): string[];
    newScope(state: TerminalState, io?: IOContext): ExpansionScope;
}

export type CommandDescription =
    | { kind: 'alias'; value: string }
    | { kind: 'keyword' }
    | { kind: 'function' }
    | { kind: 'special-builtin' }
    | { kind: 'builtin' }
    | { kind: 'file'; path: string }
    | { kind: 'not-found' };

export function ok(state: TerminalState, status = 0): ShellResult {
    return { status, state: status === state.lastExitCode ? state : { ...state, lastExitCode: status } };
}

/** Carries `$?` into the state so the next command sees it. */
export function withStatus(result: ShellResult): ShellResult {
    if (result.state.lastExitCode === result.status) return result;
    return { ...result, state: { ...result.state, lastExitCode: result.status } };
}

export function mergeEffects(a?: ShellEffects, b?: ShellEffects): ShellEffects | undefined {
    if (!a) return b;
    if (!b) return a;
    return { ...a, ...b };
}
