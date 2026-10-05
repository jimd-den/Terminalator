/**
 * msgfmt - create a message object from a message file (POSIX, GNU gettext):
 *   msgfmt [-v] [-o output-file] [-c] [-f] [--statistics] [--no-hash] filename.po...
 * Compiles PO files into one GNU .mo catalog (default messages.mo; "-" is
 * standard output). Fuzzy and untranslated entries are left out (fuzzy ones
 * kept with -f). -c checks the header and format consistency.
 */
import { CommandResponse } from '../ICommand';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { Utility } from '../shared/Utility';
import { readInputBytes } from '../shared/InputFiles';
import { strerror } from '../shared/PathOps';
import { bytesToBinaryString } from '../../services/shell/io/OutputSink';
import { headerField, parsePo, PoEntry } from '../../utils/i18n/PoFile';
import { buildMo, moMessage, MoMessage } from '../../utils/i18n/MoFile';

const TRY = "Try 'msgfmt --help' for more information.\n";
const REQUIRED_HEADER = ['Project-Id-Version', 'PO-Revision-Date', 'Last-Translator', 'Language-Team', 'MIME-Version', 'Content-Type', 'Content-Transfer-Encoding', 'Language'];
const LONG_WITH_VALUE = new Set(['output-file', 'directory', 'resource', 'locale', 'alignment', 'template', 'keyword', 'source', 'endianness']);
const OTHER_MODES = ['java', 'java2', 'csharp', 'csharp-resources', 'tcl', 'qt', 'desktop', 'xml'];

export class MsgfmtCommand extends Utility {
    readonly utility = 'msgfmt';

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        let output: string | undefined;
        let directory: string | undefined;
        let check = false, useFuzzy = false, statistics = false, verbose = false, hash = true, mode: string | undefined;
        const files: string[] = [];
        for (let i = 0; i < args.length; i++) {
            const a = args[i];
            if (a === '--') { files.push(...args.slice(i + 1)); break; }
            if (a.startsWith('--')) {
                const [name, inline] = a.substring(2).split(/=(.*)/s, 2);
                const value = LONG_WITH_VALUE.has(name) ? (inline ?? args[++i]) : undefined;
                switch (name) {
                    case 'help': return this.respond(state, 'Usage: msgfmt [OPTION] filename.po ...\n\nGenerate binary message catalog from textual translation description.\n');
                    case 'version': return this.respond(state, 'msgfmt (GNU gettext-tools) 0.21\n');
                    case 'output-file': output = value; break;
                    case 'directory': directory = value; break;
                    case 'check': case 'check-format': case 'check-header': case 'check-domain': check = true; break;
                    case 'use-fuzzy': useFuzzy = true; break;
                    case 'statistics': statistics = true; break;
                    case 'verbose': verbose = true; break;
                    case 'no-hash': hash = false; break;
                    case 'strict': case 'check-accelerators': case 'check-compatibility': case 'use-untranslated': break;
                    default:
                        if (OTHER_MODES.includes(name)) { mode = name; break; }
                        if (LONG_WITH_VALUE.has(name)) break;
                        return this.fail(state, `msgfmt: unrecognized option '${a}'\n${TRY}`);
                }
                continue;
            }
            if (!a.startsWith('-') || a === '-') { files.push(a); continue; }
            for (let j = 1; j < a.length; j++) {
                const c = a[j];
                if ('odDrlLa'.includes(c)) {
                    const v = j + 1 < a.length ? a.substring(j + 1) : args[++i];
                    if (v === undefined) return this.fail(state, `msgfmt: option requires an argument -- '${c}'\n${TRY}`);
                    if (c === 'o') output = v;
                    if (c === 'd') directory = v;
                    break;
                }
                if (c === 'c') check = true;
                else if (c === 'f') useFuzzy = true;
                else if (c === 'v') verbose = true;
                else if (c === 'j') mode = 'java';
                else if (c === 'h') return this.respond(state, 'Usage: msgfmt [OPTION] filename.po ...\n');
                else if (c === 'V') return this.respond(state, 'msgfmt (GNU gettext-tools) 0.21\n');
                else return this.fail(state, `msgfmt: invalid option -- '${c}'\n${TRY}`);
            }
        }
        if (mode) {
            if (mode.startsWith('java') && directory === undefined) return this.fail(state, `msgfmt: --${mode} requires a "-d directory" specification\n${TRY}`);
            return this.fail(state, `msgfmt: --${mode} output is not supported on this system\n`);
        }
        if (files.length === 0) return this.fail(state, `msgfmt: no input file given\n${TRY}`);

        const diagnostics: string[] = [];
        let fatal = 0;
        const entries: PoEntry[] = [];
        const seen = new Map<string, string>();
        for (const f of files) {
            const input = readInputBytes(context, f);
            if (!input.ok) {
                return this.fail(state, diagnostics.join('') + `msgfmt: error while opening "${f}" for reading: ${input.error.replace(/^.*: /, '')}\n`);
            }
            const name = f === '-' ? '<stdin>' : f;
            const parsed = parsePo(new TextDecoder().decode(input.data), name);
            diagnostics.push(...parsed.errors.map(e => e + '\n'));
            fatal += parsed.errors.length;
            for (const e of parsed.entries) {
                const key = (e.msgctxt !== undefined ? e.msgctxt + '\x04' : '') + e.msgid;
                if (seen.has(key)) {
                    diagnostics.push(`${name}:${e.line}: duplicate message definition...\n${seen.get(key)}: ...this is the location of the first definition\n`);
                    fatal++;
                    continue;
                }
                seen.set(key, `${name}:${e.line}`);
                fatal += this.check(e, name, diagnostics);
                entries.push(e);
            }
        }
        if (fatal) {
            diagnostics.push(`msgfmt: found ${fatal} fatal error${fatal === 1 ? '' : 's'}\n`);
            return this.fail(state, diagnostics.join(''));
        }

        let translated = 0, fuzzy = 0, untranslated = 0;
        const messages: MoMessage[] = [];
        for (const e of entries) {
            const isHeader = e.msgid === '' && e.msgctxt === undefined;
            const isFuzzy = e.flags.includes('fuzzy');
            const empty = e.msgstr.length === 0 || e.msgstr.some(s => !s);
            if (!isHeader) {
                if (empty) untranslated++;
                else if (isFuzzy) fuzzy++;
                else translated++;
            }
            if (empty || (isFuzzy && !useFuzzy && !isHeader)) continue;
            messages.push(moMessage(e.msgid, e.msgstr, e.msgctxt, e.msgidPlural));
        }
        if (statistics || verbose) {
            const parts = [`${translated} translated message${translated === 1 ? '' : 's'}`];
            if (fuzzy) parts.push(`${fuzzy} fuzzy translation${fuzzy === 1 ? '' : 's'}`);
            if (untranslated) parts.push(`${untranslated} untranslated message${untranslated === 1 ? '' : 's'}`);
            diagnostics.push(parts.join(', ') + '.\n');
        }
        if (check && entries[0]?.msgid === '' && entries[0].msgctxt === undefined) {
            const header = entries[0].msgstr[0] ?? '';
            for (const f of REQUIRED_HEADER) {
                if (headerField(header, f) === undefined) diagnostics.push(`${files[0]}:${entries[0].line}: warning: header field '${f}' missing in header\n`);
            }
        }
        const stderr = diagnostics.join('') || undefined;
        // GNU msgfmt writes no catalog when there is nothing to put in it.
        if (messages.length === 0) return { output: '', stderr, exitCode: 0, newState: state };

        const mo = buildMo(messages, hash);
        const target = output ?? 'messages.mo';
        if (target === '-') return { output: bytesToBinaryString(mo), binary: true, stderr, exitCode: 0, newState: state };
        const fs = context.fileSystemService;
        const path = fs.resolveAbsolutePath(directory && !target.startsWith('/') ? `${directory}/${target}` : target, context.cwd);
        try {
            fs.writeFile(path, mo, 'w');
        } catch (e) {
            return this.fail(state, (stderr ?? '') + `msgfmt: error while opening "${target}" for writing: ${strerror(e)}\n`);
        }
        return { output: '', stderr, exitCode: 0, newState: state };
    }

    private fail(state: TerminalState, stderr: string): CommandResponse {
        return { output: '', stderr, exitCode: 1, newState: state };
    }

    /** msgid and msgstr must agree on leading and trailing newlines (always checked). */
    private check(e: PoEntry, file: string, out: string[]): number {
        if (e.msgid === '') return 0;
        let errors = 0;
        const ids = [e.msgid, e.msgidPlural ?? e.msgid];
        e.msgstr.forEach((s, i) => {
            if (!s) return;
            const id = i === 0 ? ids[0] : ids[1];
            if (id.startsWith('\n') !== s.startsWith('\n')) {
                out.push(`${file}:${e.line}: 'msgid' and 'msgstr${e.msgidPlural !== undefined ? `[${i}]` : ''}' entries do not both begin with '\\n'\n`);
                errors++;
            }
            if (id.endsWith('\n') !== s.endsWith('\n')) {
                out.push(`${file}:${e.line}: 'msgid' and 'msgstr${e.msgidPlural !== undefined ? `[${i}]` : ''}' entries do not both end with '\\n'\n`);
                errors++;
            }
        });
        return errors;
    }
}
