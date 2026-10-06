import { BuiltinResult, ShellBuiltin, fail } from './ShellBuiltin';
import { getPositional, setVariable, unsetVariable } from '../expansion/ShellVariables';

/** Hidden cursor inside a clustered option argument such as `-abc`. */
const POS_VAR = '__GETOPTS_POS';

/** getopts optstring name [arg...] — POSIX option parsing (XCU getopts). */
export const GetoptsBuiltin: ShellBuiltin = {
    names: ['getopts'],
    special: false,
    run(ctx): BuiltinResult {
        const [optstring, name, ...explicit] = ctx.args;
        if (optstring === undefined || name === undefined) return fail(ctx, 'usage: getopts optstring name [arg...]', 2);
        const args = explicit.length ? explicit : getPositional(ctx.state);
        const silent = optstring.startsWith(':');
        let state = ctx.state;

        let optind = parseInt(state.environment.OPTIND ?? '1', 10) || 1;
        let pos = parseInt(state.environment[POS_VAR] ?? '1', 10) || 1;
        const finish = (status: number, value: string): BuiltinResult => {
            state = setVariable(state, name, value);
            state = setVariable(state, 'OPTIND', String(optind));
            state = setVariable(state, POS_VAR, String(pos));
            return { status, state };
        };

        const arg = args[optind - 1];
        if (arg === undefined || pos === 1 && (arg === '-' || !arg.startsWith('-'))) return finish(1, '?');
        if (pos === 1 && arg === '--') { optind++; return finish(1, '?'); }

        const c = arg[pos];
        const advance = () => {
            pos++;
            if (pos >= arg.length) { optind++; pos = 1; }
        };
        const idx = c === ':' ? -1 : optstring.indexOf(c);

        if (idx === -1) {
            advance();
            if (silent) { state = setVariable(state, 'OPTARG', c); }
            else { ctx.io.stderr.write(`getopts: illegal option -- ${c}\n`); state = unsetVariable(state, 'OPTARG'); }
            return finish(0, '?');
        }

        if (optstring[idx + 1] === ':') {
            if (pos + 1 < arg.length) {
                state = setVariable(state, 'OPTARG', arg.substring(pos + 1));
                optind++;
            } else if (optind < args.length) {
                state = setVariable(state, 'OPTARG', args[optind]);
                optind += 2;
            } else {
                optind++;
                pos = 1;
                if (silent) { state = setVariable(state, 'OPTARG', c); return finish(0, ':'); }
                ctx.io.stderr.write(`getopts: option requires an argument -- ${c}\n`);
                state = unsetVariable(state, 'OPTARG');
                return finish(0, '?');
            }
            pos = 1;
            return finish(0, c);
        }

        advance();
        state = unsetVariable(state, 'OPTARG');
        return finish(0, c);
    },
};
