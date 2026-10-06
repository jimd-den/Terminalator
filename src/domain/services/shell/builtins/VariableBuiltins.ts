import { TerminalState } from '../../../entities/TerminalState';
import { BuiltinContext, BuiltinResult, ShellBuiltin, fail, out, shellQuote } from './ShellBuiltin';
import {
    OPTION_LETTERS, ShellOption, exportVariable, getOption, getPositional, isExported, isValidName,
    markReadonly, setOption, setPositional, setVariable, unsetVariable
} from '../expansion/ShellVariables';
import { printNode } from '../ShellPrinter';

/** Variables the shell keeps for itself (getopts cursor); hidden from listings. */
export const isHiddenVariable = (name: string) => name.startsWith('__') || /^[0-9]+$/.test(name);

function sortedNames(state: TerminalState): string[] {
    return Object.keys(state.environment).filter(n => !isHiddenVariable(n)).sort();
}

/** Shared by export/readonly: `NAME[=value]` operands with an attribute setter. */
function assignWithAttribute(
    ctx: BuiltinContext,
    operands: string[],
    attribute: (s: TerminalState, name: string) => TerminalState
): BuiltinResult {
    let state = ctx.state;
    let status = 0;
    for (const op of operands) {
        const eq = op.indexOf('=');
        const name = eq === -1 ? op : op.substring(0, eq);
        if (!isValidName(name)) {
            ctx.io.stderr.write(`${ctx.name}: ${name}: bad variable name\n`);
            status = 1;
            continue;
        }
        if (eq !== -1) state = setVariable(state, name, op.substring(eq + 1));
        state = attribute(state, name);
    }
    return { status, state };
}

/** export [-p] [name[=value]...] */
export const ExportBuiltin: ShellBuiltin = {
    names: ['export'],
    special: true,
    run(ctx): BuiltinResult {
        const unexport = ctx.args.includes('-n');
        const functions = ctx.args.includes('-f');
        const operands = ctx.args.filter(a => !/^-[pnf]$/.test(a) && a !== '--');
        if (functions) return { status: 0 }; // functions are always visible to subshells here
        if (unexport) {
            return { status: 0, state: { ...ctx.state, exportedVars: ctx.state.exportedVars?.filter(n => !operands.includes(n)) } };
        }
        if (operands.length === 0) {
            for (const name of sortedNames(ctx.state)) {
                if (isExported(ctx.state, name)) out(ctx, `export ${name}=${shellQuote(ctx.state.environment[name])}\n`);
            }
            return { status: 0 };
        }
        return assignWithAttribute(ctx, operands, exportVariable);
    },
};

/** readonly [-p] [name[=value]...] */
export const ReadonlyBuiltin: ShellBuiltin = {
    names: ['readonly'],
    special: true,
    run(ctx): BuiltinResult {
        if (ctx.args.includes('-f')) return { status: 0 }; // readonly functions: accepted, not enforced
        const operands = ctx.args.filter(a => a !== '-p' && a !== '--');
        if (operands.length === 0) {
            for (const name of ctx.state.readonlyVars ?? []) {
                const v = ctx.state.environment[name];
                out(ctx, v === undefined ? `readonly ${name}\n` : `readonly ${name}=${shellQuote(v)}\n`);
            }
            return { status: 0 };
        }
        return assignWithAttribute(ctx, operands, markReadonly);
    },
};

/** unset [-fv] name... */
export const UnsetBuiltin: ShellBuiltin = {
    names: ['unset'],
    special: true,
    run(ctx): BuiltinResult {
        let mode: 'v' | 'f' = 'v';
        let state = ctx.state;
        let status = 0;
        for (const arg of ctx.args) {
            if (arg === '-f') { mode = 'f'; continue; }
            if (arg === '-v') { mode = 'v'; continue; }
            if (mode === 'f') {
                const functions = new Map(state.functions);
                functions.delete(arg);
                state = { ...state, functions };
                continue;
            }
            if (!isValidName(arg)) { ctx.io.stderr.write(`unset: ${arg}: bad variable name\n`); status = 1; continue; }
            try {
                state = unsetVariable(state, arg);
            } catch (e: any) {
                ctx.io.stderr.write(`unset: ${e.message}\n`);
                status = 1;
            }
        }
        return { status, state };
    },
};

/** shift [n] */
export const ShiftBuiltin: ShellBuiltin = {
    names: ['shift'],
    special: true,
    run(ctx): BuiltinResult {
        if (ctx.args.length > 1) return fail(ctx, 'too many arguments', 2);
        const n = ctx.args.length ? Number(ctx.args[0]) : 1;
        const params = getPositional(ctx.state);
        if (!Number.isInteger(n) || n < 0) return fail(ctx, `${ctx.args[0]}: bad number`, 2);
        if (n > params.length) return fail(ctx, "can't shift that many", 2);
        return { status: 0, state: setPositional(ctx.state, params.slice(n)) };
    },
};

const ALL_OPTIONS: ShellOption[] = [
    'allexport', 'errexit', 'ignoreeof', 'monitor', 'noclobber', 'noglob', 'noexec', 'notify', 'nounset', 'verbose', 'vi', 'xtrace', 'pipefail',
];

/** set [-abCefhmnuvx] [-o option] [--] [arg...]  — options and positional parameters. */
export const SetBuiltin: ShellBuiltin = {
    names: ['set'],
    special: true,
    run(ctx): BuiltinResult {
        const args = ctx.args;
        if (args.length === 0) {
            for (const name of sortedNames(ctx.state)) out(ctx, `${name}=${shellQuote(ctx.state.environment[name])}\n`);
            for (const [name, fn] of ctx.state.functions ?? []) out(ctx, `${printNode(fn)}\n`);
            return { status: 0 };
        }

        let state = ctx.state;
        let i = 0;
        let setParams = false;
        for (; i < args.length; i++) {
            const arg = args[i];
            if (arg === '--') { i++; setParams = true; break; }
            if (arg === '-') { state = setOption(setOption(state, 'xtrace', false), 'verbose', false); i++; setParams = i < args.length; break; }
            if (!/^[-+]/.test(arg)) break;
            const on = arg[0] === '-';
            const letters = arg.substring(1);
            if (letters === 'o' || letters === '') {
                const name = args[i + 1];
                if (letters === 'o' && name === undefined) {
                    for (const opt of ALL_OPTIONS) {
                        out(ctx, on ? `${opt.padEnd(16)}${getOption(state, opt) ? 'on' : 'off'}\n` : `set ${getOption(state, opt) ? '-' : '+'}o ${opt}\n`);
                    }
                    continue;
                }
                if (!ALL_OPTIONS.includes(name as ShellOption)) return fail(ctx, `-o ${name}: invalid option name`, 2);
                state = setOption(state, name as ShellOption, on);
                i++;
                continue;
            }
            for (const letter of letters) {
                const opt = OPTION_LETTERS[letter];
                if (!opt) return fail(ctx, `-${letter}: invalid option`, 2);
                state = setOption(state, opt, on);
            }
        }
        if (setParams || i < args.length) state = setPositional(state, args.slice(i));
        return { status: 0, state };
    },
};

/** local name[=value]... — function-scoped variables (dash/ksh extension, restored on return). */
export const LocalBuiltin: ShellBuiltin = {
    names: ['local'],
    special: false,
    run(ctx): BuiltinResult {
        if (!ctx.state.callStackDepth) return fail(ctx, 'not in a function', 2);
        let state = ctx.state;
        const frames = [...(state.localFrames ?? [])];
        const frame = { ...(frames.pop() ?? {}) };
        for (const op of ctx.args) {
            const eq = op.indexOf('=');
            const name = eq === -1 ? op : op.substring(0, eq);
            if (!isValidName(name)) return fail(ctx, `${name}: bad variable name`, 2);
            if (!(name in frame)) frame[name] = Object.prototype.hasOwnProperty.call(state.environment, name) ? state.environment[name] : null;
            if (eq !== -1) state = setVariable(state, name, op.substring(eq + 1));
        }
        return { status: 0, state: { ...state, localFrames: [...frames, frame] } };
    },
};
