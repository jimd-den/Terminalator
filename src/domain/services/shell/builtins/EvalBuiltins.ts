import { BuiltinResult, ShellBuiltin, fail, out } from './ShellBuiltin';
import { printNode } from '../ShellPrinter';
import { CommandDescription } from '../ShellRuntime';

/** eval [arg...] — concatenate arguments and run them as shell input. */
export const EvalBuiltin: ShellBuiltin = {
    names: ['eval'],
    special: true,
    async run(ctx): Promise<BuiltinResult> {
        const source = ctx.args.join(' ');
        if (!source.trim()) return { status: 0 };
        const res = await ctx.runtime.runSource(source, ctx.state, ctx.io);
        return { status: res.status, state: res.state, flow: res.flow, effects: res.effects };
    },
};

/** . file [arg...] (and `source`) — run a file in the current environment. */
export const DotBuiltin: ShellBuiltin = {
    names: ['.', 'source'],
    special: true,
    async run(ctx): Promise<BuiltinResult> {
        const [file, ...params] = ctx.args;
        if (!file) return fail(ctx, 'filename argument required', 2);
        const fs = ctx.runtime.fsService;
        const state = ctx.state;

        const candidates = file.includes('/')
            ? [file]
            : [...(state.environment.PATH ?? '').split(':').filter(Boolean).map(d => `${d}/${file}`), file];
        let path: string | undefined;
        for (const c of candidates) {
            const abs = fs.resolveAbsolutePath(c, state.currentDirectory);
            const node = fs.resolve(abs, '/');
            if (node && !fs.isDirectory(node)) { path = abs; break; }
        }
        if (!path) return fail(ctx, `${file}: not found`, 1);

        let source: string;
        try {
            source = fs.readFile(path, '/', state.user);
        } catch {
            return fail(ctx, `${file}: Permission denied`, 1);
        }

        const depth = state.callStackDepth || 0;
        const callerParams = state.positionalParams;
        const res = await ctx.runtime.runSource(source, {
            ...state,
            callStackDepth: depth + 1,
            positionalParams: params.length ? params : callerParams,
        }, ctx.io);
        const flow = res.flow?.kind === 'exit' ? res.flow : undefined;
        return {
            status: res.status,
            flow,
            effects: res.effects,
            state: { ...res.state, callStackDepth: depth, positionalParams: params.length ? callerParams : res.state.positionalParams },
        };
    },
};

/** exec [command [arg...]] — replace the shell with the command. */
export const ExecBuiltin: ShellBuiltin = {
    names: ['exec'],
    special: true,
    async run(ctx): Promise<BuiltinResult> {
        let i = 0;
        // -a name / -c / -l (bash): argv0, clean environment and login marker.
        let state = ctx.state;
        while (i < ctx.args.length && /^-[acl]+$/.test(ctx.args[i])) {
            if (ctx.args[i].includes('a')) i++;
            if (ctx.args[i]?.includes('c')) state = { ...state, environment: {}, exportedVars: [] };
            i++;
        }
        const [name, ...args] = ctx.args.slice(i);
        if (!name) return { status: 0 };
        const res = await ctx.runtime.invoke(name, args, state, ctx.io, { skipFunctions: true });
        return { status: res.status, state: res.state, effects: res.effects, flow: { kind: 'exit' } };
    },
};

const KEYWORDS = new Set(['time', 'if', 'then', 'else', 'elif', 'fi', 'case', 'esac', 'for', 'while', 'until', 'do', 'done', 'in', '{', '}', '!']);

export function isKeyword(name: string): boolean {
    return KEYWORDS.has(name);
}

function describe(name: string, d: CommandDescription, fnSource?: string): string {
    switch (d.kind) {
        case 'alias': return `${name} is an alias for ${d.value}`;
        case 'keyword': return `${name} is a shell keyword`;
        case 'function': return `${name} is a function\n${fnSource ?? ''}`;
        case 'special-builtin': return `${name} is a special shell builtin`;
        case 'builtin': return `${name} is a shell builtin`;
        case 'file': return `${name} is ${d.path}`;
        default: return `${name}: not found`;
    }
}

/** command [-p] [-v|-V] name [arg...] — run or describe a command, ignoring functions. */
export const CommandBuiltin: ShellBuiltin = {
    names: ['command'],
    special: false,
    async run(ctx): Promise<BuiltinResult> {
        let i = 0;
        let mode: 'run' | 'v' | 'V' = 'run';
        for (; i < ctx.args.length; i++) {
            const a = ctx.args[i];
            if (a === '--') { i++; break; }
            if (!/^-[pvV]+$/.test(a)) break;
            if (a.includes('V')) mode = 'V';
            else if (a.includes('v') && mode !== 'V') mode = 'v';
        }
        const [name, ...args] = ctx.args.slice(i);
        if (!name) return { status: 0 };

        if (mode === 'run') {
            const res = await ctx.runtime.invoke(name, args, ctx.state, ctx.io, { skipFunctions: true });
            return { status: res.status, state: res.state, flow: res.flow, effects: res.effects };
        }

        let status = 0;
        for (const n of [name, ...args]) {
            const d = ctx.runtime.describeCommand(n, ctx.state);
            if (d.kind === 'not-found') {
                if (mode === 'V') ctx.io.stderr.write(`${n}: not found\n`);
                status = 127;
                continue;
            }
            if (mode === 'V') out(ctx, describe(n, d, printNode(ctx.state.functions?.get(n))) + '\n');
            else if (d.kind === 'alias') out(ctx, `alias ${n}='${d.value}'\n`);
            else if (d.kind === 'file') out(ctx, `${d.path}\n`);
            else out(ctx, `${n}\n`);
        }
        return { status };
    },
};

/**
 * type [-afptP] name... — describe how each name would be interpreted
 * (-a all, -t kind word, -p/-P path only: common extensions).
 */
export const TypeBuiltin: ShellBuiltin = {
    names: ['type'],
    special: false,
    run(ctx): BuiltinResult {
        let i = 0;
        const flags = new Set<string>();
        for (; i < ctx.args.length && /^-[afptP]+$/.test(ctx.args[i]); i++) for (const c of ctx.args[i].substring(1)) flags.add(c);
        if (ctx.args[i] === '--') i++;
        let status = 0;
        for (const name of ctx.args.slice(i)) {
            const d = ctx.runtime.describeCommand(name, ctx.state);
            const paths = ctx.runtime.findInPath(name, ctx.state);
            if (flags.has('P') || (flags.has('p') && !flags.has('a'))) {
                const path = flags.has('P') ? paths[0] : d.kind === 'file' ? d.path : undefined;
                if (path) out(ctx, path + '\n');
                else if (flags.has('P') || d.kind === 'not-found') status = 1;
                continue;
            }
            if (d.kind === 'not-found') {
                if (!flags.has('t')) ctx.io.stderr.write(`${name}: not found\n`);
                status = 1;
                continue;
            }
            const kinds: CommandDescription[] = flags.has('a')
                ? [
                    ...(d.kind !== 'file' ? [d] : []),
                    ...paths.map(path => ({ kind: 'file', path }) as CommandDescription),
                ]
                : [d];
            for (const k of kinds) {
                if (flags.has('t')) out(ctx, (k.kind === 'special-builtin' ? 'builtin' : k.kind) + '\n');
                else out(ctx, describe(name, k, printNode(ctx.state.functions?.get(name))) + '\n');
            }
        }
        return { status };
    },
};

/** hash [-r] [utility...] — the simulation resolves PATH on every call; this validates names. */
export const HashBuiltin: ShellBuiltin = {
    names: ['hash'],
    special: false,
    run(ctx): BuiltinResult {
        let status = 0;
        const printPaths = ctx.args.includes('-t');
        for (const name of ctx.args.filter(a => a !== '-r' && a !== '-t')) {
            const d = ctx.runtime.describeCommand(name, ctx.state);
            if (d.kind === 'not-found') {
                ctx.io.stderr.write(`hash: ${name}: not found\n`);
                status = 1;
            } else if (printPaths && d.kind === 'file') {
                out(ctx, `${d.path}\n`);
            }
        }
        return { status };
    },
};
