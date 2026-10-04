import { BuiltinResult, ShellBuiltin, fail } from './ShellBuiltin';
import { isValidName, setVariable } from '../expansion/ShellVariables';

/**
 * read [-r] [-p prompt] var... — read one line from stdin and split it
 * into fields with IFS; the last variable receives the rest of the line.
 */
export const ReadBuiltin: ShellBuiltin = {
    names: ['read'],
    special: false,
    run(ctx): BuiltinResult {
        let raw = false;
        let i = 0;
        for (; i < ctx.args.length; i++) {
            const a = ctx.args[i];
            if (a === '--') { i++; break; }
            if (a === '-r') { raw = true; continue; }
            if (a === '-p') { ctx.io.stderr.write(ctx.args[++i] ?? ''); continue; }
            // Extensions accepted for script compatibility; no keyboard is attached, so
            // timeouts (-t) and silent mode (-s) have nothing to change.
            if (a === '-t' || a === '-n' || a === '-d' || a === '-u') { i++; continue; }
            if (a === '-s') continue;
            if (/^-/.test(a) && a !== '-') return fail(ctx, `${a}: invalid option`, 2);
            break;
        }
        const names = ctx.args.slice(i);
        if (names.length === 0) names.push('REPLY');
        for (const n of names) if (!isValidName(n)) return fail(ctx, `${n}: bad variable name`, 2);

        // Read a logical line (backslash-newline joins lines unless -r).
        let line = '';
        let gotLine = false;
        let eof = false;
        while (true) {
            const chunk = ctx.io.stdin.readLine();
            if (chunk === null || chunk === '') { eof = true; break; }
            gotLine = true;
            const complete = chunk.endsWith('\n');
            let text = complete ? chunk.slice(0, -1) : chunk;
            if (!complete) eof = true;
            if (!raw && complete && /(^|[^\\])(\\\\)*\\$/.test(text)) {
                line += text.slice(0, -1);
                continue;
            }
            line += text;
            break;
        }

        const ifs = ctx.state.environment.IFS ?? ' \t\n';
        const values = splitForRead(line, ifs, names.length, raw);
        let state = ctx.state;
        names.forEach((name, idx) => { state = setVariable(state, name, values[idx] ?? ''); });
        // POSIX: non-zero when end-of-file was detected, even if a partial line was assigned.
        return { status: eof ? 1 : 0, state };
    },
};

function unescape(s: string): string {
    return s.replace(/\\(.)/g, '$1');
}

/** Field splitting for `read`: n-1 fields, remainder to the last variable. */
function splitForRead(line: string, ifs: string, count: number, raw: boolean): string[] {
    const ws = (c: string) => (c === ' ' || c === '\t' || c === '\n') && ifs.includes(c);
    const isIfs = (c: string) => ifs.includes(c);
    const fields: string[] = [];
    let i = 0;
    const n = line.length;
    const skipWs = () => { while (i < n && ws(line[i])) i++; };

    skipWs();
    while (fields.length < count - 1 && i < n) {
        let field = '';
        while (i < n && !isIfs(line[i])) {
            if (!raw && line[i] === '\\' && i + 1 < n) { field += line[i + 1]; i += 2; continue; }
            field += line[i++];
        }
        fields.push(field);
        skipWs();
        if (i < n && isIfs(line[i]) && !ws(line[i])) { i++; skipWs(); }
    }
    let rest = line.substring(i);
    let end = rest.length;
    while (end > 0 && ws(rest[end - 1]) && !(rest[end - 2] === '\\' && !raw)) end--;
    rest = rest.substring(0, end);
    fields.push(raw ? rest : unescape(rest));
    return fields;
}
