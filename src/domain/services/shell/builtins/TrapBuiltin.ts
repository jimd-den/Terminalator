import { BuiltinResult, ShellBuiltin, out, shellQuote } from './ShellBuiltin';

const SIGNAL_NUMBERS: Record<string, string> = {
    '0': 'EXIT', '1': 'HUP', '2': 'INT', '3': 'QUIT', '6': 'ABRT', '9': 'KILL', '14': 'ALRM', '15': 'TERM',
};
const KNOWN = new Set(['EXIT', 'HUP', 'INT', 'QUIT', 'ILL', 'TRAP', 'ABRT', 'BUS', 'FPE', 'KILL', 'USR1', 'SEGV', 'USR2',
    'PIPE', 'ALRM', 'TERM', 'CHLD', 'CONT', 'STOP', 'TSTP', 'TTIN', 'TTOU', 'URG', 'XCPU', 'XFSZ', 'VTALRM', 'PROF', 'WINCH', 'SYS']);

export function normalizeSignal(spec: string): string | null {
    const upper = spec.toUpperCase().replace(/^SIG/, '');
    if (SIGNAL_NUMBERS[upper]) return SIGNAL_NUMBERS[upper];
    return KNOWN.has(upper) ? upper : null;
}

/** trap [action condition...] | trap -p | trap -l */
export const TrapBuiltin: ShellBuiltin = {
    names: ['trap'],
    special: true,
    run(ctx): BuiltinResult {
        const args = ctx.args[0] === '--' ? ctx.args.slice(1) : ctx.args;
        const traps = ctx.state.traps ?? new Map<string, string>();

        if (args.length === 0 || args[0] === '-p') {
            for (const [sig, action] of traps) out(ctx, `trap -- ${shellQuote(action)} ${sig}\n`);
            return { status: 0 };
        }
        if (args[0] === '-l') {
            out(ctx, Object.entries(SIGNAL_NUMBERS).map(([n, s]) => `${n}) SIG${s}`).join(' ') + '\n');
            return { status: 0 };
        }

        // A first operand that is a signal number means "reset these conditions".
        const reset = args[0] === '-' || /^[0-9]+$/.test(args[0]);
        const action = reset ? null : args[0];
        const conditions = reset && args[0] !== '-' ? args : args.slice(1);

        const next = new Map(traps);
        let status = 0;
        for (const c of conditions) {
            const sig = normalizeSignal(c);
            if (!sig) {
                ctx.io.stderr.write(`trap: ${c}: bad trap\n`);
                status = 1;
                continue;
            }
            if (action === null) next.delete(sig);
            else next.set(sig, action);
        }
        return { status, state: { ...ctx.state, traps: next } };
    },
};
