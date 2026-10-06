/**
 * m4 - macro processor (POSIX, GNU m4 1.4 behaviour):
 *   m4 [-s] [-D name[=val]]... [-U name]... [file...]
 * GNU options: -P (prefix builtins with m4_), -G (traditional), -Q (quiet),
 * -E (fatal warnings), -I dir (include path), --version, --help; debugging
 * options (-d, -t, -l, -o, -L, -B, -S, -T) are accepted and ignored.
 *
 * The expansion engine lives in ./m4; this class wires it to the file
 * system (include, undivert, mkstemp) and to child processes (syscmd).
 */
import { CommandResponse } from '../ICommand';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { Utility } from '../shared/Utility';
import { readInputBytes } from '../shared/InputFiles';
import { strerror } from '../shared/PathOps';
import { bytesToBinaryString, binaryStringToBytes, bytesToStreamText } from '../../services/shell/io/OutputSink';
import { M4Processor, M4Exit, M4Host, M4Options } from './m4/M4Processor';

const VERSION = `m4 (GNU M4) 1.4.19
Copyright (C) 2021 Free Software Foundation, Inc.
License GPLv3+: GNU GPL version 3 or later <https://gnu.org/licenses/gpl.html>.
This is free software: you are free to change and redistribute it.
There is NO WARRANTY, to the extent permitted by law.

Written by Rene' Seindal.
`;

const HELP = `Usage: m4 [OPTION]... [FILE]...
Process macros in FILEs.  If no FILE or if FILE is \`-', standard input
is read.

Operation modes:
      --help                   display this help and exit
      --version                output version information and exit
  -E, --fatal-warnings         once: warnings become errors, twice: stop
                                 execution at first error
  -i, --interactive            unbuffer output, ignore interrupts
  -P, --prefix-builtins        force a \`m4_' prefix to all builtins
  -Q, --quiet, --silent        suppress some warnings for builtins

Preprocessor features:
  -D, --define=NAME[=VALUE]    define NAME as having VALUE, or empty
  -I, --include=DIRECTORY      append DIRECTORY to include path
  -s, --synclines              generate \`#line NUM "FILE"' lines
  -U, --undefine=NAME          undefine NAME

Limits control:
  -g, --gnu                    override -G to re-enable GNU extensions
  -G, --traditional            suppress all GNU extensions
`;

/** Options taking a value: short letter -> long name. */
const WITH_VALUE: Record<string, string> = { D: 'define', U: 'undefine', I: 'include', t: 'trace', l: 'arglength', o: 'debugfile', L: 'nesting-limit', B: '', S: '', T: '', F: 'freeze-state', R: 'reload-state', W: 'word-regexp' };
const FLAGS: Record<string, string> = { E: 'fatal-warnings', i: 'interactive', P: 'prefix-builtins', Q: 'quiet', s: 'synclines', g: 'gnu', G: 'traditional', e: 'interactive' };
const LONG_ALIASES: Record<string, string> = { silent: 'quiet', 'warn-macro-sequence': '' };

/** UTF-8 text -> byte string. */
const toBytes = (s: string) => bytesToBinaryString(new TextEncoder().encode(s));
const fromBytes = (s: string) => bytesToStreamText(binaryStringToBytes(s));

export class M4Command extends Utility {
    readonly utility = 'm4';

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        const options: M4Options = {};
        const defines: { op: 'D' | 'U'; name: string; value: string }[] = [];
        const includeDirs: string[] = [];
        const files: string[] = [];

        for (let i = 0; i < args.length; i++) {
            const a = args[i];
            if (a === '--') { files.push(...args.slice(i + 1)); break; }
            if (a === '-' || !a.startsWith('-')) { files.push(a); continue; }
            let opt: string;
            let value: string | undefined;
            if (a.startsWith('--')) {
                const eq = a.indexOf('=');
                let long = a.substring(2, eq === -1 ? undefined : eq);
                if (eq !== -1) value = a.substring(eq + 1);
                if (long === 'help') return this.respond(state, HELP);
                if (long === 'version') return this.respond(state, VERSION);
                long = LONG_ALIASES[long] ?? long;
                const short = Object.keys(WITH_VALUE).find(k => WITH_VALUE[k] === long) ?? Object.keys(FLAGS).find(k => FLAGS[k] === long);
                if (long === '' || long === 'debug') continue;
                if (!short) return this.badUsage(state, `unrecognized option '${a}'`);
                opt = short;
                if (WITH_VALUE[short] !== undefined && value === undefined) {
                    value = args[++i];
                    if (value === undefined) return this.badUsage(state, `option '--${long}' requires an argument`);
                }
                if (!this.applyOption(opt, value, options, defines, includeDirs)) return this.badUsage(state, `unsupported option '${a}'`);
                continue;
            }
            for (let j = 1; j < a.length; j++) {
                opt = a[j];
                if (opt === 'd') break; // -d[FLAGS]
                if (opt in WITH_VALUE) {
                    value = j + 1 < a.length ? a.substring(j + 1) : args[++i];
                    if (value === undefined) return this.badUsage(state, `option requires an argument -- '${opt}'`);
                    if (!this.applyOption(opt, value, options, defines, includeDirs)) return this.badUsage(state, `unsupported option -- '${opt}'`);
                    break;
                }
                if (!(opt in FLAGS)) return this.badUsage(state, `invalid option -- '${opt}'`);
                this.applyOption(opt, undefined, options, defines, includeDirs);
            }
        }

        const m4 = new M4Processor(this.host(context, includeDirs), options);
        for (const d of defines) {
            if (d.op === 'D') m4.define(toBytes(d.name), { text: toBytes(d.value) });
            else m4.undefine(toBytes(d.name));
        }

        let status = 0;
        const fatal: string[] = [];
        try {
            for (const f of files.length ? files : ['-']) {
                const input = readInputBytes(context, f);
                if (!input.ok) {
                    fatal.push(`m4: cannot open \`${f}': ${input.error.replace(/^.*: /, '')}\n`);
                    status = 1;
                    continue;
                }
                await m4.processFile(f === '-' ? 'stdin' : f, bytesToBinaryString(input.data));
            }
            await m4.finish();
        } catch (e) {
            if (!(e instanceof M4Exit)) throw e;
            status = e.status;
        }
        if (m4.failed && status === 0) status = 1;
        return {
            output: m4.output,
            binary: true,
            stderr: fromBytes(m4.stderr.join('')) + fatal.join('') || undefined,
            exitCode: status,
            newState: state,
        };
    }

    private badUsage(state: TerminalState, message: string): CommandResponse {
        return { output: '', stderr: `m4: ${message}\nTry 'm4 --help' for more information.\n`, exitCode: 1, newState: state };
    }

    /** Records one option; returns false for options the simulator cannot honour. */
    private applyOption(opt: string, value: string | undefined, options: M4Options,
        defines: { op: 'D' | 'U'; name: string; value: string }[], includeDirs: string[]): boolean {
        switch (opt) {
            case 'D': {
                const eq = value!.indexOf('=');
                defines.push({ op: 'D', name: eq === -1 ? value! : value!.substring(0, eq), value: eq === -1 ? '' : value!.substring(eq + 1) });
                return true;
            }
            case 'U': defines.push({ op: 'U', name: value!, value: '' }); return true;
            case 'I': includeDirs.push(value!); return true;
            case 'E': options.fatalWarnings = true; return true;
            case 'P': options.prefixBuiltins = true; return true;
            case 'Q': options.quiet = true; return true;
            case 's': options.syncLines = true; return true;
            case 'G': options.traditional = true; return true;
            case 'g': options.traditional = false; return true;
            case 'F': case 'R': return false;
            default: return true; // debugging and limits: accepted, no effect
        }
    }

    private host(context: ProcessContext, includeDirs: string[]): M4Host {
        const fs = context.fileSystemService;
        const read = (path: string) => {
            const r = readInputBytes(context, path);
            return r.ok ? { ok: true as const, data: bytesToBinaryString(r.data) } : { ok: false as const, error: r.error.replace(/^.*: /, '') };
        };
        let tmpCounter = 0;
        return {
            readFile: name => {
                const first = read(name);
                if (first.ok || name.startsWith('/')) return first;
                const dirs = [...includeDirs, ...(context.env.M4PATH ?? '').split(':').filter(Boolean)];
                for (const dir of dirs) {
                    const r = read(`${dir.replace(/\/$/, '')}/${name}`);
                    if (r.ok) return r;
                }
                return first;
            },
            shell: async command => {
                if (!context.spawn) return { status: 127, output: '' };
                const tmp = `/tmp/m4-syscmd.${context.pid ?? 0}.${tmpCounter++}`;
                const status = await context.spawn(['sh', '-c', '{ eval "$2"\n} >"$1"', 'sh', tmp, fromBytes(command)]);
                const r = read(tmp);
                try { fs.deleteNode(fs.resolveAbsolutePath(tmp, context.cwd)); } catch { /* already gone */ }
                return { status, output: r.ok ? r.data : '' };
            },
            mkstemp: template => {
                const name = fromBytes(template);
                const xs = /X*$/.exec(name)![0].length;
                const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
                for (let attempt = 0; attempt < 100; attempt++) {
                    let suffix = '';
                    for (let k = 0; k < xs; k++) suffix += chars[Math.floor(Math.random() * chars.length)];
                    const candidate = name.substring(0, name.length - xs) + suffix;
                    const abs = fs.resolveAbsolutePath(candidate, context.cwd);
                    if (fs.resolve(abs, '/', false)) { if (xs === 0) return { ok: false, error: 'File exists' }; continue; }
                    try {
                        fs.writeFile(abs, '', 'w');
                        try { fs.chmod(abs, 0o600); } catch { /* best effort */ }
                        return { ok: true, name: toBytes(candidate) };
                    } catch (e) {
                        return { ok: false, error: strerror(e) };
                    }
                }
                return { ok: false, error: 'File exists' };
            },
        };
    }
}
