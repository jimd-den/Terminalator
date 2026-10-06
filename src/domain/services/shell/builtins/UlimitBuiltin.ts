import { BuiltinResult, ShellBuiltin, fail, out } from './ShellBuiltin';

/** null = unlimited; values are in the resource's display unit. */
export type Limit = { soft: number | null; hard: number | null };

interface Resource { flag: string; label: string; soft: number | null; hard: number | null; }

/** The resources dash reports, with its labels and Linux's default limits. */
const RESOURCES: Resource[] = [
    { flag: 't', label: 'time(seconds)', soft: null, hard: null },
    { flag: 'f', label: 'file(blocks)', soft: null, hard: null },
    { flag: 'd', label: 'data(kbytes)', soft: null, hard: null },
    { flag: 's', label: 'stack(kbytes)', soft: 8192, hard: null },
    { flag: 'c', label: 'coredump(blocks)', soft: 0, hard: null },
    { flag: 'm', label: 'memory(kbytes)', soft: null, hard: null },
    { flag: 'l', label: 'locked memory(kbytes)', soft: 8192, hard: 8192 },
    { flag: 'p', label: 'process', soft: 15421, hard: 15421 },
    { flag: 'n', label: 'nofiles', soft: 1024, hard: 1048576 },
    { flag: 'v', label: 'vmemory(kbytes)', soft: null, hard: null },
    { flag: 'w', label: 'locks', soft: null, hard: null },
    { flag: 'r', label: 'rtprio', soft: 0, hard: 0 },
];

const show = (v: number | null) => (v === null ? 'unlimited' : String(v));
/** null (unlimited) compares as larger than any number. */
const exceeds = (a: number | null, b: number | null) => b !== null && (a === null || a > b);

/** ulimit [-H|-S] [-a | -tfdscmlpnvwr [limit]] — get or set the shell's resource limits. */
export const UlimitBuiltin: ShellBuiltin = {
    names: ['ulimit'],
    special: false,
    run(ctx): BuiltinResult {
        let hard = false, soft = false, all = false;
        let res = RESOURCES[1];
        let i = 0;
        for (; i < ctx.args.length; i++) {
            const a = ctx.args[i];
            if (a === '--') { i++; break; }
            if (!a.startsWith('-') || a === '-') break;
            for (const c of a.substring(1)) {
                if (c === 'H') hard = true;
                else if (c === 'S') soft = true;
                else if (c === 'a') all = true;
                else {
                    const r = RESOURCES.find(x => x.flag === c);
                    if (!r) return fail(ctx, `Illegal option -${c}`, 2);
                    res = r;
                }
            }
        }
        const operands = ctx.args.slice(i);
        if (operands.length > 1) return fail(ctx, 'too many arguments', 2);
        const limits = ctx.state.limits ?? {};
        const current = (r: Resource): Limit => limits[r.flag] ?? { soft: r.soft, hard: r.hard };
        const pick = (l: Limit) => (hard && !soft ? l.hard : l.soft);

        if (all) {
            out(ctx, RESOURCES.map(r => `${r.label.padEnd(20)} ${show(pick(current(r)))}\n`).join(''));
            return { status: 0 };
        }
        if (!operands.length) {
            out(ctx, show(pick(current(res))) + '\n');
            return { status: 0 };
        }
        const spec = operands[0];
        let value: number | null;
        if (spec === 'unlimited') value = null;
        else if (/^[0-9]+$/.test(spec)) value = parseInt(spec, 10);
        else return fail(ctx, 'bad number', 2);

        const old = current(res);
        const next: Limit = { soft: hard && !soft ? old.soft : value, hard: soft && !hard ? old.hard : value };
        const root = ctx.state.user.uid === 0;
        if (exceeds(next.soft, next.hard) || (!root && exceeds(next.hard, old.hard))) {
            return fail(ctx, 'error setting limit (Operation not permitted)', 2);
        }
        return { status: 0, state: { ...ctx.state, limits: { ...limits, [res.flag]: next } } };
    },
};
