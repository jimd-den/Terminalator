import { BuiltinResult, ShellBuiltin, fail, out } from './ShellBuiltin';
import { setVariable } from '../expansion/ShellVariables';

const X_OK = 1;

/** Lexically normalises an absolute path (`a/./b/../c` → `a/c`). */
export function normalizePath(path: string): string {
    const parts: string[] = [];
    for (const p of path.split('/')) {
        if (p === '' || p === '.') continue;
        if (p === '..') parts.pop();
        else parts.push(p);
    }
    return '/' + parts.join('/');
}

/** cd [-L|-P] [directory | -] — change the working directory (with CDPATH). */
export const CdBuiltin: ShellBuiltin = {
    names: ['cd', 'chdir'],
    special: false,
    run(ctx): BuiltinResult {
        const operands = ctx.args.filter(a => a !== '-L' && a !== '-P' && a !== '--');
        if (operands.length > 1) return fail(ctx, 'too many arguments', 1);
        const env = ctx.state.environment;
        let target = operands[0];
        let print = false;

        if (target === undefined) {
            target = env.HOME;
            if (!target) return fail(ctx, 'HOME not set', 1);
        } else if (target === '-') {
            target = env.OLDPWD;
            if (!target) return fail(ctx, 'OLDPWD not set', 1);
            print = true;
        }

        const fs = ctx.runtime.fsService;
        const cwd = ctx.state.currentDirectory;
        const candidates: string[] = [];
        if (!target.startsWith('/') && !/^\.\.?(\/|$)/.test(target) && env.CDPATH) {
            for (const dir of env.CDPATH.split(':')) candidates.push(`${dir || '.'}/${target}`);
        }
        candidates.push(target);

        let lastError = `${target}: No such file or directory`;
        for (const candidate of candidates) {
            const abs = normalizePath(candidate.startsWith('/') ? candidate : `${cwd}/${candidate}`);
            const node = fs.resolve(abs, '/');
            if (!node) continue;
            if (!fs.isDirectory(node)) { lastError = `${target}: Not a directory`; continue; }
            if (!fs.hasAccess(node.inodeId, ctx.state.user, X_OK)) { lastError = `${target}: Permission denied`; continue; }

            if (print || candidate !== target) out(ctx, `${abs}\n`);
            let state = { ...ctx.state, currentDirectory: abs };
            state = setVariable(state, 'OLDPWD', cwd);
            state = setVariable(state, 'PWD', abs);
            return { status: 0, state, effects: { metadata: { data: { targetDir: abs } } } };
        }
        return fail(ctx, lastError, 2);
    },
};

/** pwd [-L|-P] */
export const PwdBuiltin: ShellBuiltin = {
    names: ['pwd'],
    special: false,
    run(ctx): BuiltinResult {
        out(ctx, `${ctx.state.currentDirectory}\n`);
        return { status: 0 };
    },
};
