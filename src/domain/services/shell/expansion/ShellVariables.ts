import { TerminalState } from '../../../entities/TerminalState';

/**
 * ShellVariables - pure helpers over the variable-related parts of
 * TerminalState (parameters, options, export/readonly attributes).
 * Every mutator returns a new state; nothing is modified in place.
 */

export type ShellOption =
    | 'allexport' | 'errexit' | 'ignoreeof' | 'monitor' | 'noclobber' | 'noglob'
    | 'noexec' | 'notify' | 'nounset' | 'verbose' | 'xtrace' | 'vi' | 'pipefail';

/** Single-letter flags for `set -x` / `$-`. */
export const OPTION_LETTERS: Record<string, ShellOption> = {
    a: 'allexport', e: 'errexit', m: 'monitor', C: 'noclobber', f: 'noglob',
    n: 'noexec', b: 'notify', u: 'nounset', v: 'verbose', x: 'xtrace',
};

export const NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function isValidName(name: string): boolean {
    return NAME_RE.test(name);
}

export function getOption(state: TerminalState, option: ShellOption): boolean {
    return !!state.shellOptions?.[option];
}

export function setOption(state: TerminalState, option: ShellOption, on: boolean): TerminalState {
    return { ...state, shellOptions: { ...(state.shellOptions || {}), [option]: on } };
}

/** `$-`: the currently set single-letter options. */
export function optionFlags(state: TerminalState): string {
    return Object.entries(OPTION_LETTERS)
        .filter(([, name]) => getOption(state, name))
        .map(([letter]) => letter)
        .join('');
}

export function isReadonly(state: TerminalState, name: string): boolean {
    return !!state.readonlyVars?.includes(name);
}

export function isExported(state: TerminalState, name: string): boolean {
    // Legacy states without export tracking treat every variable as exported.
    return state.exportedVars === undefined || state.exportedVars.includes(name);
}

export class ReadonlyVariableError extends Error {
    constructor(name: string) {
        super(`${name}: is read only`);
        this.name = 'ReadonlyVariableError';
    }
}

/** Assigns a shell variable, honouring `readonly` and `set -a`. */
export function setVariable(state: TerminalState, name: string, value: string): TerminalState {
    if (isReadonly(state, name)) throw new ReadonlyVariableError(name);
    let next: TerminalState = { ...state, environment: { ...state.environment, [name]: value } };
    if (getOption(state, 'allexport')) next = exportVariable(next, name);
    return next;
}

export function unsetVariable(state: TerminalState, name: string): TerminalState {
    if (isReadonly(state, name)) throw new ReadonlyVariableError(name);
    const environment = { ...state.environment };
    delete environment[name];
    const exportedVars = state.exportedVars?.filter(n => n !== name);
    return { ...state, environment, exportedVars };
}

export function exportVariable(state: TerminalState, name: string): TerminalState {
    if (state.exportedVars === undefined || state.exportedVars.includes(name)) return state;
    return { ...state, exportedVars: [...state.exportedVars, name] };
}

export function markReadonly(state: TerminalState, name: string): TerminalState {
    if (isReadonly(state, name)) return state;
    return { ...state, readonlyVars: [...(state.readonlyVars || []), name] };
}

/** The environment a child process would inherit: exported variables only. */
export function exportedEnvironment(state: TerminalState): Record<string, string> {
    if (state.exportedVars === undefined) return { ...state.environment };
    const env: Record<string, string> = {};
    for (const name of state.exportedVars) {
        if (name in state.environment) env[name] = state.environment[name];
    }
    return env;
}

export function getPositional(state: TerminalState): string[] {
    if (state.positionalParams) return state.positionalParams;
    // Legacy: positional parameters stored as numbered environment entries.
    const legacy: string[] = [];
    for (let i = 1; state.environment[String(i)] !== undefined; i++) legacy.push(state.environment[String(i)]);
    return legacy;
}

export function setPositional(state: TerminalState, params: string[]): TerminalState {
    return { ...state, positionalParams: [...params] };
}

/**
 * Looks up a parameter: special parameters, positional parameters and
 * variables. Returns undefined when the parameter is unset.
 */
export function getParameter(state: TerminalState, name: string): string | undefined {
    const positional = getPositional(state);
    switch (name) {
        case '?': return String(state.lastExitCode ?? 0);
        case '#': return String(positional.length);
        case '$': return String(state.shellPid ?? 4242);
        case '!': return state.lastBackgroundPid !== undefined ? String(state.lastBackgroundPid) : undefined;
        case '-': return optionFlags(state);
        case '0': return state.environment['0'] ?? state.scriptName ?? 'sh';
        case '@':
        case '*': return positional.join(' ');
    }
    if (/^[1-9][0-9]*$/.test(name)) return positional[parseInt(name, 10) - 1];
    return Object.prototype.hasOwnProperty.call(state.environment, name) ? state.environment[name] : undefined;
}
