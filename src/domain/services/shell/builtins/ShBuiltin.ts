import { BuiltinResult, ShellBuiltin, fail } from './ShellBuiltin';
import { OPTION_LETTERS } from '../expansion/ShellVariables';

/**
 * sh [-abCefhmnuvx] [-c command_string [name [arg...]] | file [arg...] | -s [arg...]]
 * Starts a child shell (also installed as bash/dash for script compatibility).
 */
export const ShBuiltin: ShellBuiltin = {
    names: ['sh', 'bash', 'dash'],
    special: false,
    async run(ctx): Promise<BuiltinResult> {
        const args = ctx.args;
        let i = 0;
        let commandString: string | undefined;
        let fromStdin = false;
        const options: string[] = [];

        for (; i < args.length; i++) {
            const a = args[i];
            if (a === '--' ) { i++; break; }
            if (a === '-c') { commandString = ''; continue; }
            if (a === '-s') { fromStdin = true; continue; }
            if (/^[-+][a-zA-Z]+$/.test(a)) {
                for (const letter of a.substring(1)) {
                    if (letter === 'c') commandString = '';
                    else if (letter === 's') fromStdin = true;
                    else if ('ilr'.includes(letter)) continue; // interactive / login / restricted: no effect here
                    else if (OPTION_LETTERS[letter]) options.push(`${a[0]}${letter}`);
                    else return fail(ctx, `-${letter}: invalid option`, 2);
                }
                continue;
            }
            break;
        }
        const rest = args.slice(i);
        const prefix = options.length ? `set ${options.join(' ')}\n` : '';

        if (commandString !== undefined) {
            const [source, name, ...params] = rest;
            if (source === undefined) return fail(ctx, '-c requires an argument', 2);
            const res = await ctx.runtime.runChildShell(prefix + source, params, name ?? ctx.name, ctx.state, ctx.io);
            return { status: res.status };
        }

        if (!fromStdin && rest.length > 0) {
            const [file, ...params] = rest;
            const fs = ctx.runtime.fsService;
            const abs = fs.resolveAbsolutePath(file, ctx.state.currentDirectory);
            const node = fs.resolve(abs, '/');
            if (!node || fs.isDirectory(node)) return fail(ctx, `cannot open ${file}: No such file`, 127);
            let source: string;
            try {
                source = fs.readFile(abs, '/', ctx.state.user);
            } catch {
                return fail(ctx, `cannot open ${file}: Permission denied`, 126);
            }
            const res = await ctx.runtime.runChildShell(prefix + source, params, file, ctx.state, ctx.io);
            return { status: res.status };
        }

        const source = ctx.io.stdin.read() ?? '';
        const res = await ctx.runtime.runChildShell(prefix + source, rest, ctx.name, ctx.state, ctx.io);
        return { status: res.status };
    },
};
