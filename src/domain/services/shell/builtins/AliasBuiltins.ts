import { BuiltinResult, ShellBuiltin, out, shellQuote } from './ShellBuiltin';

/** alias [name[=value]...] */
export const AliasBuiltin: ShellBuiltin = {
    names: ['alias'],
    special: false,
    run(ctx): BuiltinResult {
        const aliases = ctx.state.aliases ?? {};
        const prefix = ctx.args[0] === '-p' ? 'alias ' : '';
        const operands = prefix ? ctx.args.slice(1) : ctx.args;
        const print = (name: string) => out(ctx, `${prefix}${name}=${shellQuote(aliases[name])}\n`);
        if (operands.length === 0) {
            Object.keys(aliases).sort().forEach(print);
            return { status: 0 };
        }
        const next = { ...aliases };
        let status = 0;
        for (const arg of operands) {
            const eq = arg.indexOf('=');
            if (eq > 0) {
                const name = arg.substring(0, eq);
                if (/[\s=\/$`'"\\|&;<>()]/.test(name)) {
                    ctx.io.stderr.write(`alias: ${name}: invalid alias name\n`);
                    status = 1;
                    continue;
                }
                next[name] = arg.substring(eq + 1);
            } else if (aliases[arg] !== undefined) {
                print(arg);
            } else {
                ctx.io.stderr.write(`alias: ${arg}: not found\n`);
                status = 1;
            }
        }
        return { status, state: { ...ctx.state, aliases: next } };
    },
};

/** unalias [-a] name... */
export const UnaliasBuiltin: ShellBuiltin = {
    names: ['unalias'],
    special: false,
    run(ctx): BuiltinResult {
        if (ctx.args.includes('-a')) return { status: 0, state: { ...ctx.state, aliases: {} } };
        if (ctx.args.length === 0) {
            ctx.io.stderr.write('unalias: usage: unalias [-a] name [name ...]\n');
            return { status: 1 };
        }
        const next = { ...(ctx.state.aliases ?? {}) };
        let status = 0;
        for (const name of ctx.args) {
            if (next[name] === undefined) {
                ctx.io.stderr.write(`unalias: ${name}: not found\n`);
                status = 1;
            }
            delete next[name];
        }
        return { status, state: { ...ctx.state, aliases: next } };
    },
};
