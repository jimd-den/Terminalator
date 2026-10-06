/**
 * sed - stream editor (POSIX XCU sed):
 *   sed [-n] [-E|-r] [-s] [-i[suffix]] script [file...]
 *   sed [-n] [-E|-r] [-s] [-i[suffix]] -e script... | -f script_file... [file...]
 */
import { CommandResponse } from '../ICommand';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { FileSystemService } from '../../services/FileSystemService';
import { CommandCapability } from '../IStructuredCommand';
import { Utility } from '../shared/Utility';
import { readInput } from '../shared/InputFiles';
import { strerror } from '../shared/PathOps';
import { SedParser, SedSyntaxError } from './sed/SedScript';
import { SedMachine } from './sed/SedMachine';

export class SedCommand extends Utility {
    readonly utility = 'sed';
    readonly capabilities = [CommandCapability.FILTER, CommandCapability.TRANSFORM];

    constructor(private fs?: FileSystemService) { super(); }

    buildArgs(requirements: Record<string, any>): string[] {
        const args: string[] = [];
        if (requirements.flags) args.push(...requirements.flags);
        if (requirements.script) args.push(requirements.script);
        if (requirements.path) args.push(requirements.path);
        return args;
    }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const scripts: string[] = [];
        const files: string[] = [];
        let quiet = false, extended = false, separate = false;
        let inPlace: string | null = null;

        for (let i = 0; i < args.length; i++) {
            const a = args[i];
            if (a === '--') { files.push(...args.slice(i + 1)); break; }
            if (a === '--posix' || a === '--debug' || a === '-u' || a === '--unbuffered') continue;
            if (a === '--quiet' || a === '--silent') { quiet = true; continue; }
            if (a === '--regexp-extended') { extended = true; continue; }
            if (a.startsWith('--in-place')) { inPlace = a.includes('=') ? a.split('=')[1] : ''; continue; }
            if (a === '--expression' || a === '--file') { args[i] = a === '--file' ? '-f' : '-e'; i--; continue; }
            if (!a.startsWith('-') || a === '-') { files.push(a); continue; }
            for (let k = 1; k < a.length; k++) {
                const f = a[k];
                if (f === 'n') quiet = true;
                else if (f === 'E' || f === 'r') extended = true;
                else if (f === 's') separate = true;
                else if (f === 'z' || f === 'u') continue;
                else if (f === 'i') { inPlace = a.substring(k + 1); break; }
                else if (f === 'e' || f === 'f') {
                    const value = k + 1 < a.length ? a.substring(k + 1) : args[++i];
                    if (value === undefined) return this.usage(state, `option requires an argument -- '${f}'`);
                    if (f === 'e') scripts.push(value);
                    else {
                        const src = readInput(context, value);
                        if (!src.ok) return this.usage(state, `couldn't open file ${value}: ${src.error.split(': ').pop()}`);
                        scripts.push(src.data.replace(/\n$/, ''));
                    }
                    break;
                } else return this.usage(state, `invalid option -- '${f}'`);
            }
        }
        if (scripts.length === 0) {
            if (files.length === 0) return this.usage(state, 'no script specified');
            scripts.push(files.shift()!);
        }

        let script = scripts.join('\n');
        if (script.startsWith('#n\n') || script === '#n') quiet = true;

        let machine: SedMachine;
        const wfiles = new Set<string>();
        let stdoutWrites = '';
        try {
            const cmds = new SedParser({ extended }).parse(script);
            machine = new SedMachine(cmds, { quiet, separate: separate || inPlace !== null }, {
                writeFile: (path, data) => {
                    if (path === '/dev/stdout') { stdoutWrites += data; return; }
                    const fsys = context.fileSystemService;
                    const abs = fsys.resolveAbsolutePath(path, context.cwd);
                    fsys.writeFile(abs, data, wfiles.has(abs) ? 'a' : 'w', undefined, undefined, '/');
                    wfiles.add(abs);
                },
                readFile: path => {
                    const r = readInput(context, path === '/dev/stdin' ? '-' : path);
                    return r.ok ? r.data : null;
                },
            });
        } catch (e: any) {
            if (e instanceof SedSyntaxError) return this.usage(state, e.message);
            return this.usage(state, `-e expression #1, char 0: ${e.message}`);
        }

        const errors: string[] = [];
        let out = '';
        const inputs = files.length ? files : ['-'];
        const readable: { name: string; data: string }[] = [];
        for (const f of inputs) {
            const r = readInput(context, f);
            if (!r.ok) { errors.push(`can't read ${r.error}`); continue; }
            readable.push({ name: f, data: r.data });
        }

        const split = (data: string) => {
            const lines = data.split('\n');
            if (lines[lines.length - 1] === '') lines.pop();
            return lines;
        };

        try {
            if (inPlace !== null) {
                for (const { name, data } of readable) {
                    const res = machine.run(split(data), true);
                    const fsys = context.fileSystemService;
                    const abs = fsys.resolveAbsolutePath(name, context.cwd);
                    if (inPlace) fsys.writeFile(abs + inPlace, data, 'w', undefined, undefined, '/');
                    fsys.writeFile(abs, res.out, 'w', undefined, undefined, '/');
                    if (res.quit !== null) return this.respond(state, stdoutWrites, errors, res.quit);
                }
            } else if (separate) {
                for (let k = 0; k < readable.length; k++) {
                    const res = machine.run(split(readable[k].data), true);
                    out += res.out;
                    if (res.quit !== null) return this.respond(state, out + stdoutWrites, errors, res.quit);
                }
            } else {
                // One continuous stream: a missing final newline in one file still joins lines.
                const all = readable.map(r => r.data).join('');
                const res = machine.run(split(all), true);
                out = res.out;
                const lastData = readable.length ? readable[readable.length - 1].data : '';
                if (lastData !== '' && !lastData.endsWith('\n') && out.endsWith('\n')) out = out.slice(0, -1);
                if (res.quit !== null) return this.respond(state, out + stdoutWrites, errors, res.quit);
            }
        } catch (e: any) {
            return this.respond(state, out, [...errors, strerror(e)], 4);
        }
        return this.respond(state, out + stdoutWrites, errors, errors.length ? 2 : 0);
    }
}
