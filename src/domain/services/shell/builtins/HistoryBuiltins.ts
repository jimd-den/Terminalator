import { BuiltinContext, BuiltinResult, ShellBuiltin, fail, out } from './ShellBuiltin';

/** The commands before the one currently running (the last entry is this command line). */
function previous(ctx: BuiltinContext): string[] {
    const h = ctx.state.history ?? [];
    return h.slice(0, Math.max(0, h.length - 1));
}

/** Resolves a history operand (number, negative offset or prefix) to a 1-based index. */
function find(history: string[], spec: string): number | null {
    if (/^-?[0-9]+$/.test(spec)) {
        const n = parseInt(spec, 10);
        const idx = n < 0 ? history.length + 1 + n : n;
        if (history.length === 0) return null;
        return Math.min(Math.max(idx, 1), history.length);
    }
    for (let i = history.length; i >= 1; i--) if (history[i - 1].startsWith(spec)) return i;
    return null;
}

async function run(ctx: BuiltinContext, commands: string): Promise<BuiltinResult> {
    const history = [...(ctx.state.history ?? [])];
    history[history.length - 1] = commands.replace(/\n$/, ''); // the fc line is replaced by what it ran
    const res = await ctx.runtime.runSource(commands, { ...ctx.state, history }, ctx.io);
    return { status: res.status, state: res.state, flow: res.flow, effects: res.effects };
}

/**
 * fc - process the command history list (POSIX):
 *   fc [-r] [-e editor] [first [last]]
 *   fc -l [-nr] [first [last]]
 *   fc -s [old=new] [first]
 */
export const FcBuiltin: ShellBuiltin = {
    names: ['fc'],
    special: false,
    async run(ctx): Promise<BuiltinResult> {
        let list = false, numbers = true, reverse = false, reexec = false;
        let editor: string | undefined;
        let i = 0;
        for (; i < ctx.args.length; i++) {
            const a = ctx.args[i];
            if (a === '--') { i++; break; }
            if (a === '-e') { editor = ctx.args[++i]; if (editor === undefined) return fail(ctx, '-e: option requires an argument', 2); continue; }
            if (!/^-[lnrs]+$/.test(a)) break;
            for (const c of a.substring(1)) {
                if (c === 'l') list = true;
                if (c === 'n') numbers = false;
                if (c === 'r') reverse = true;
                if (c === 's') reexec = true;
            }
        }
        const operands = ctx.args.slice(i);
        const history = previous(ctx);
        if (editor === '-') reexec = true;

        if (reexec) {
            let subst: [string, string] | undefined;
            if (operands[0]?.includes('=')) {
                const s = operands.shift()!;
                subst = [s.substring(0, s.indexOf('=')), s.substring(s.indexOf('=') + 1)];
            }
            const idx = find(history, operands[0] ?? '-1');
            if (idx === null) return fail(ctx, 'no command found', 1);
            let cmd = history[idx - 1];
            if (subst) cmd = cmd.replace(subst[0], subst[1]);
            out(ctx, cmd + '\n');
            return run(ctx, cmd + '\n');
        }

        const first = operands[0] ?? (list ? '-16' : '-1');
        const last = operands[1] ?? (list && operands[0] === undefined ? '-1' : first);
        let a = find(history, first);
        let b = find(history, last);
        if (history.length === 0 && list) return { status: 0 };
        if (a === null || b === null) return fail(ctx, 'no command found', 1);
        if (a > b) { [a, b] = [b, a]; reverse = !reverse; }
        let indices = Array.from({ length: b - a + 1 }, (_, k) => a! + k);
        if (reverse) indices = indices.reverse();

        if (list) {
            for (const n of indices) out(ctx, numbers ? `${n}\t${history[n - 1]}\n` : `\t${history[n - 1]}\n`);
            return { status: 0 };
        }

        // Edit the commands with the editor, then execute the result.
        const fs = ctx.runtime.fsService.asUser(ctx.state.user, ctx.state.umask ?? 0o022);
        const tmp = `/tmp/fc.${Date.now().toString(36)}`;
        fs.writeFile(tmp, indices.map(n => history[n - 1]).join('\n') + '\n', 'w');
        const ed = editor ?? ctx.state.environment.FCEDIT ?? ctx.state.environment.EDITOR ?? 'ed';
        const edited = await ctx.runtime.runSource(`${ed} ${tmp}`, ctx.state, ctx.io);
        if (edited.status !== 0) return fail(ctx, `editor '${ed}' failed`, edited.status);
        let commands: string;
        try {
            commands = fs.readFile(tmp);
            fs.deleteNode(tmp);
        } catch {
            return fail(ctx, 'cannot read edited commands', 1);
        }
        out(ctx, commands);
        return run(ctx, commands);
    },
};

/** history [n] — list the command history (common extension). */
export const HistoryBuiltin: ShellBuiltin = {
    names: ['history'],
    special: false,
    run(ctx): BuiltinResult {
        const history = ctx.state.history ?? [];
        if (ctx.args[0] === '-c') return { status: 0, state: { ...ctx.state, history: [] } };
        const n = ctx.args[0] !== undefined ? parseInt(ctx.args[0], 10) : history.length;
        if (isNaN(n)) return fail(ctx, `${ctx.args[0]}: numeric argument required`, 2);
        const start = Math.max(0, history.length - n);
        for (let i = start; i < history.length; i++) out(ctx, `${String(i + 1).padStart(5)}  ${history[i]}\n`);
        return { status: 0 };
    },
};
