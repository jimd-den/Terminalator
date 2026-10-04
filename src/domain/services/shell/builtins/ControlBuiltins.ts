import { BuiltinContext, BuiltinResult, ShellBuiltin, fail } from './ShellBuiltin';

function parseCount(ctx: BuiltinContext, fallback: number): number | null {
    if (ctx.args.length === 0) return fallback;
    const n = Number(ctx.args[0]);
    if (!/^-?[0-9]+$/.test(ctx.args[0]) || !Number.isFinite(n)) return null;
    return n;
}

/** `:`, `true` - do nothing, successfully. */
export const ColonBuiltin: ShellBuiltin = {
    names: [':'],
    special: true,
    run: () => ({ status: 0 }),
};

export const TrueBuiltin: ShellBuiltin = { names: ['true'], special: false, run: () => ({ status: 0 }) };
export const FalseBuiltin: ShellBuiltin = { names: ['false'], special: false, run: () => ({ status: 1 }) };

/** break [n] / continue [n] - leave or restart the n-th enclosing loop. */
export const LoopControlBuiltin: ShellBuiltin = {
    names: ['break', 'continue'],
    special: true,
    run(ctx): BuiltinResult {
        if (ctx.args.length > 1) return fail(ctx, 'too many arguments', 1);
        const n = parseCount(ctx, 1);
        if (n === null || n < 1) return fail(ctx, `${ctx.args[0]}: bad number`, 2);
        return { status: 0, flow: { kind: ctx.name as 'break' | 'continue', levels: n } };
    },
};

/** return [n] - return from a function or dot script. */
export const ReturnBuiltin: ShellBuiltin = {
    names: ['return'],
    special: true,
    run(ctx): BuiltinResult {
        const n = parseCount(ctx, ctx.state.lastExitCode ?? 0);
        if (n === null) return fail(ctx, `${ctx.args[0]}: numeric argument required`, 2);
        if (!ctx.state.callStackDepth) return fail(ctx, "can only `return' from a function or sourced script", 1);
        return { status: ((n % 256) + 256) % 256, flow: { kind: 'return' } };
    },
};

/** exit [n] - leave the shell (the EXIT trap runs at the top level). */
export const ExitBuiltin: ShellBuiltin = {
    names: ['exit'],
    special: true,
    run(ctx): BuiltinResult {
        const n = parseCount(ctx, ctx.state.lastExitCode ?? 0);
        if (n === null) {
            ctx.io.stderr.write(`exit: ${ctx.args[0]}: numeric argument required\n`);
            return { status: 2, flow: { kind: 'exit' } };
        }
        return { status: ((n % 256) + 256) % 256, flow: { kind: 'exit' } };
    },
};
