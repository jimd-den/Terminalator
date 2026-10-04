import { BuiltinResult, ShellBuiltin, fail, out } from './ShellBuiltin';

const WHO: Record<string, number> = { u: 0o700, g: 0o070, o: 0o007, a: 0o777 };
const PERM: Record<string, number> = { r: 0o444, w: 0o222, x: 0o111 };

/** Applies a symbolic mode (u=rwx,g+w,o-r) to the permission set 0777 & ~mask. */
function applySymbolic(mask: number, spec: string): number | null {
    let perms = 0o777 & ~mask;
    for (const clause of spec.split(',')) {
        const m = /^([ugoa]*)([-+=])([rwx]*)$/.exec(clause);
        if (!m) return null;
        const who = (m[1] || 'a').split('').reduce((acc, c) => acc | WHO[c], 0);
        const bits = m[3].split('').reduce((acc, c) => acc | PERM[c], 0) & who;
        if (m[2] === '+') perms |= bits;
        else if (m[2] === '-') perms &= ~bits;
        else perms = (perms & ~who) | bits;
    }
    return 0o777 & ~perms;
}

function symbolic(mask: number): string {
    const perms = 0o777 & ~mask;
    const part = (shift: number) => ['r', 'w', 'x'].filter((_, i) => perms & (4 >> i) << shift).join('');
    return `u=${part(6)},g=${part(3)},o=${part(0)}`;
}

/** umask [-S] [mask] — get or set the file mode creation mask. */
export const UmaskBuiltin: ShellBuiltin = {
    names: ['umask'],
    special: false,
    run(ctx): BuiltinResult {
        const mask = ctx.state.umask ?? 0o022;
        const sym = ctx.args[0] === '-S';
        const operands = sym ? ctx.args.slice(1) : ctx.args;
        if (operands.length > 1) return fail(ctx, 'too many arguments', 1);
        if (operands.length === 0) {
            out(ctx, sym ? symbolic(mask) + '\n' : mask.toString(8).padStart(4, '0') + '\n');
            return { status: 0 };
        }
        const spec = operands[0];
        let next: number | null;
        if (/^[0-7]+$/.test(spec)) next = parseInt(spec, 8) > 0o777 ? null : parseInt(spec, 8);
        else next = applySymbolic(mask, spec);
        if (next === null) return fail(ctx, `${spec}: invalid mask`, 1);
        return { status: 0, state: { ...ctx.state, umask: next } };
    },
};
