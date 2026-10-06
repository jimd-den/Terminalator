/**
 * awk - pattern scanning and processing language (POSIX XCU awk).
 *
 *   awk [-F sepstring] [-v assignment]... program [argument...]
 *   awk [-F sepstring] -f progfile [-f progfile]... [-v assignment]... [argument...]
 *
 * Arguments are input files ("-" is standard input) or var=value
 * assignments, processed in order. `-F t` means a tab. Exit status: the
 * value of `exit expr`, 0 by default, 2 for syntax and fatal errors.
 *
 * This class only parses options and adapts the process (file system,
 * streams, child processes) to the engine in ./awk.
 */
import { CommandResponse } from '../../entities/Command';
import { ProcessContext, getStdinAsString } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { StringStream } from '../../entities/Stream';
import { CommandCapability } from '../IStructuredCommand';
import { FileSystemService } from '../../services/FileSystemService';
import { Utility } from '../shared/Utility';
import { readInput } from '../shared/InputFiles';
import { strerror } from '../shared/PathOps';
import { AwkSyntaxError, processEscapes } from './awk/AwkLexer';
import { parseAwk } from './awk/AwkParser';
import { AwkInterpreter } from './awk/AwkInterpreter';
import { AwkRuntimeError } from './awk/AwkErrors';
import { AwkHost, ReadResult } from './awk/AwkHost';
import { RegexSyntaxError } from '../../utils/PosixRegex';

const USAGE = 'usage: awk [-F fs][-v var=value][prog | -f progfile][file ...]';

export class AwkCommand extends Utility {
    readonly utility = 'awk';
    override readonly capabilities = [CommandCapability.TRANSFORM, CommandCapability.FILTER];

    constructor(_fs?: FileSystemService) { super(); }

    override buildArgs(requirements: Record<string, any>): string[] {
        const args: string[] = [];
        if (requirements.fieldSeparator) args.push('-F', requirements.fieldSeparator);
        if (requirements.program) args.push(requirements.program);
        if (requirements.path) args.push(requirements.path);
        return args;
    }

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        let fs: string | undefined;
        const assignments: [string, string][] = [];
        const progFiles: string[] = [];
        let i = 0;
        for (; i < args.length; i++) {
            const a = args[i];
            if (a === '--') { i++; break; }
            if (!a.startsWith('-') || a === '-') break;
            const opt = a[1];
            if (opt !== 'F' && opt !== 'v' && opt !== 'f') return this.usage(state, `invalid option -- '${opt}'\n${USAGE}`, 2);
            const value = a.length > 2 ? a.slice(2) : args[++i];
            if (value === undefined) return this.usage(state, `option requires an argument -- '${opt}'\n${USAGE}`, 2);
            if (opt === 'F') fs = value === 't' ? '\t' : processEscapes(value);
            else if (opt === 'f') progFiles.push(value);
            else {
                const eq = value.indexOf('=');
                if (eq <= 0 || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(value.slice(0, eq))) {
                    return this.usage(state, `improper assignment: -v ${value}`, 2);
                }
                assignments.push([value.slice(0, eq), value.slice(eq + 1)]);
            }
        }

        let source: string;
        if (progFiles.length > 0) {
            const parts: string[] = [];
            for (const f of progFiles) {
                const r = readInput(context, f);
                if (!r.ok) return this.usage(state, `couldn't open file ${f}`, 2);
                parts.push(r.data);
            }
            source = parts.join('\n');
        } else {
            if (i >= args.length) return this.usage(state, USAGE, 2);
            source = args[i++];
        }

        let program;
        try {
            program = parseAwk(source);
        } catch (e) {
            if (e instanceof AwkSyntaxError) return this.usage(state, e.message, 2);
            throw e;
        }

        const awk = new AwkInterpreter(program, this.host(context), { argv: ['awk', ...args.slice(i)], assignments, fs });
        try {
            const status = await awk.run();
            return this.respond(state, '', [], status);
        } catch (e) {
            await awk.shutdown();
            if (e instanceof AwkRuntimeError || e instanceof RegexSyntaxError) {
                return this.usage(state, e instanceof AwkRuntimeError ? e.message : `run time error: ${e.message}`, 2);
            }
            throw e;
        }
    }

    /** Adapts the process context to the interpreter's host port. */
    private host(context: ProcessContext): AwkHost {
        return {
            writeStdout: data => context.stdout.write(data),
            writeStderr: data => context.stderr.write(data),
            readStdin: () => getStdinAsString(context) ?? '',
            readFile: (path): ReadResult => {
                const r = readInput(context, path);
                if (r.ok) return { ok: true, data: r.data };
                const error = r.error.startsWith(`${path}: `) ? r.error.slice(path.length + 2) : r.error;
                return { ok: false, error, directory: error === 'Is a directory' };
            },
            writeFile: (path, data, append) => {
                const fsys = context.fileSystemService;
                try {
                    fsys.writeFile(fsys.resolveAbsolutePath(path, context.cwd), data, append ? 'a' : 'w', undefined, undefined, '/');
                    return null;
                } catch (e) {
                    return strerror(e);
                }
            },
            run: async (command, { stdin, capture }) => {
                if (!context.spawn) return { status: 127, output: '' };
                const out = capture ? new StringStream() : undefined;
                const status = await context.spawn(['sh', '-c', command], { stdin, stdout: out });
                return { status, output: out ? out.getContents() : '' };
            },
            environ: context.env,
            now: () => Date.now() / 1000,
        };
    }
}
