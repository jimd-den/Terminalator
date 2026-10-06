/**
 * gencat - generate a formatted message catalog (POSIX, glibc behaviour):
 *   gencat [-H header] [--new] catfile msgfile...
 *   gencat [-H header] [--new] -o catfile [msgfile...]
 * Message source files ("-" is standard input; none means standard input)
 * are compiled into catfile ("-" is standard output). An existing catalog
 * is merged unless --new. Diagnostics have no program-name prefix, as in
 * glibc; the exit status is 1 when any were reported.
 */
import { CommandResponse } from '../ICommand';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { Utility } from '../shared/Utility';
import { readInputBytes } from '../shared/InputFiles';
import { statPath } from '../shared/FileInfo';
import { strerror } from '../shared/PathOps';
import { bytesToBinaryString } from '../../services/shell/io/OutputSink';
import { NlsCatalog } from '../../utils/i18n/NlsCatalog';

const TRY = "Try `gencat --help' or `gencat --usage' for more information.\n";
const HELP = `Usage: gencat [OPTION...] -o OUTPUT-FILE [INPUT-FILE]...
  or:  gencat [OPTION...] [OUTPUT-FILE [INPUT-FILE]...]
Generate message catalog.

  -H, --header=NAME          Create C header file NAME containing symbol
                             definitions
      --new                  Do not use existing catalog, force new output file
  -o, --output=NAME          Write output to file NAME
  -?, --help                 Give this help list
      --usage                Give a short usage message
  -V, --version              Print program version
`;

export class GencatCommand extends Utility {
    readonly utility = 'gencat';

    constructor(_fs?: unknown) { super(); }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        let output: string | undefined;
        let headerName: string | undefined;
        let forceNew = false;
        const operands: string[] = [];
        for (let i = 0; i < args.length; i++) {
            const a = args[i];
            if (a === '--') { operands.push(...args.slice(i + 1)); break; }
            if (a.startsWith('--')) {
                const [name, inline] = a.substring(2).split(/=(.*)/s, 2);
                if (name === 'help') return this.respond(state, HELP);
                if (name === 'usage') return this.respond(state, 'Usage: gencat [-?V] [-H NAME] [-o NAME] [--header=NAME] [--new] [--output=NAME]\n            [--help] [--usage] [--version] -o OUTPUT-FILE [INPUT-FILE]...\n');
                if (name === 'version') return this.respond(state, 'gencat (GNU libc) 2.39\n');
                if (name === 'new') { forceNew = true; continue; }
                if (name === 'header' || name === 'output') {
                    const v = inline ?? args[++i];
                    if (v === undefined) return this.bad(state, `option '--${name}' requires an argument`);
                    if (name === 'header') headerName = v; else output = v;
                    continue;
                }
                return this.bad(state, `unrecognized option '${a}'`);
            }
            if (!a.startsWith('-') || a === '-') { operands.push(a); continue; }
            for (let j = 1; j < a.length; j++) {
                const c = a[j];
                if (c === 'H' || c === 'o') {
                    const v = j + 1 < a.length ? a.substring(j + 1) : args[++i];
                    if (v === undefined) return this.bad(state, `option requires an argument -- '${c}'`);
                    if (c === 'H') headerName = v; else output = v;
                    break;
                }
                if (c === '?') return this.respond(state, HELP);
                if (c === 'V') return this.respond(state, 'gencat (GNU libc) 2.39\n');
                return this.bad(state, `invalid option -- '${c}'`);
            }
        }
        const target = output ?? operands.shift() ?? '-';
        const inputs = operands.length ? operands : ['-'];

        const diagnostics: string[] = [];
        let catalog: NlsCatalog | null = null;
        for (const f of inputs) {
            const input = readInputBytes(context, f === '/dev/stdin' ? '-' : f);
            if (!input.ok) {
                diagnostics.push(`cannot open input file \`${f}': ${input.error.replace(/^.*: /, '')}`);
                continue;
            }
            catalog ??= new NlsCatalog();
            catalog.read(bytesToBinaryString(input.data), f === '-' || f === '/dev/stdin' ? '*standard input*' : f);
        }
        if (catalog) diagnostics.push(...catalog.errors);
        if (!catalog) return this.done(state, '', diagnostics);

        const fs = context.fileSystemService;
        const toStdout = target === '-' || target === '/dev/stdout';
        if (!forceNew && !toStdout && statPath(context, target)) {
            const old = readInputBytes(context, target);
            if (!old.ok || !catalog.mergeOld(old.data)) {
                diagnostics.push('while opening old catalog file: Invalid argument');
                return { output: '', stderr: diagnostics.join('\n') + '\n', exitCode: 1, newState: state };
            }
        }
        const bytes = catalog.encode();
        let out = '';
        if (toStdout) out = bytesToBinaryString(bytes);
        else {
            try {
                fs.writeFile(fs.resolveAbsolutePath(target, context.cwd), bytes, 'w');
            } catch (e) {
                diagnostics.push(`cannot open output file \`${target}': ${strerror(e)}`);
                return { output: '', stderr: diagnostics.join('\n') + '\n', exitCode: 1, newState: state };
            }
        }
        if (headerName !== undefined) {
            const text = catalog.header();
            if (headerName === '-' || headerName === '/dev/stdout') out += text;
            else {
                try {
                    fs.writeFile(fs.resolveAbsolutePath(headerName, context.cwd), text, 'w');
                } catch (e) {
                    diagnostics.push(`cannot open output file \`${headerName}': ${strerror(e)}`);
                    return { output: out, binary: true, stderr: diagnostics.join('\n') + '\n', exitCode: 1, newState: state };
                }
            }
        }
        return this.done(state, out, diagnostics);
    }

    private done(state: TerminalState, output: string, diagnostics: string[]): CommandResponse {
        return {
            output,
            binary: true,
            stderr: diagnostics.length ? diagnostics.join('\n') + '\n' : undefined,
            exitCode: diagnostics.length ? 1 : 0,
            newState: state,
        };
    }

    private bad(state: TerminalState, message: string): CommandResponse {
        return { output: '', stderr: `gencat: ${message}\n${TRY}`, exitCode: 64, newState: state };
    }
}
