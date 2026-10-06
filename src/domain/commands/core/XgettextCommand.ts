/**
 * xgettext - extract gettext call strings from programs (POSIX, GNU gettext):
 *   xgettext [-j] [-n|--no-location] [-c[TAG]] [-d default-domain] [-p dir]
 *            [-o output|-] [-k[keyword[:spec]]]... [-L lang] [-s] [-w width]
 *            [--omit-header] [--from-code=enc] file...
 * C/C++ (by default for unknown extensions) and shell scripts are scanned
 * for keyword calls; the messages are written as a PO template (default
 * <domain>.po, domain "messages") with the standard header. No file is
 * written when nothing was found.
 */
import { CommandResponse } from '../ICommand';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { Utility } from '../shared/Utility';
import { readInput } from '../shared/InputFiles';
import { strerror } from '../shared/PathOps';
import { formatPoEntry, parsePo, PoEntry } from '../../utils/i18n/PoFile';
import { C_KEYWORDS, ExtractedMessage, extractC, extractShell, isCFormat, isShFormat, KeywordSpec, parseKeyword, SHELL_KEYWORDS } from '../../utils/i18n/MessageExtractor';

const TRY = "Try 'xgettext --help' for more information.\n";
const C_EXT = /\.(c|h|cc|cpp|cxx|c\+\+|hh|hpp|hxx|C|H|m)$/;
const SHELL_EXT = /\.(sh|bash)$/;
/** Options that take a value: short letter or long name. */
const SHORT_VALUE = 'odpDfLwxlmM';
const LONG_VALUE = new Set(['output', 'default-domain', 'output-dir', 'directory', 'files-from', 'language', 'width', 'exclude-file',
    'from-code', 'copyright-holder', 'package-name', 'package-version', 'msgid-bugs-address', 'flag', 'its', 'msgstr-prefix', 'msgstr-suffix']);

interface Options {
    output?: string;
    domain: string;
    dir?: string;
    join: boolean;
    location: boolean;
    commentTag: string | null;
    keywords: string[];
    noDefaultKeywords: boolean;
    language?: string;
    sort: 'none' | 'msgid' | 'file';
    width: number;
    omitHeader: boolean;
    fromCode?: string;
    forcePo: boolean;
    packageName?: string;
    packageVersion?: string;
    bugsAddress: string;
    copyrightHolder?: string;
    files: string[];
}

export class XgettextCommand extends Utility {
    readonly utility = 'xgettext';

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const parsed = this.parseArgs(args, context);
        if (typeof parsed === 'string') return this.fail(state, parsed);
        if ('help' in parsed) return this.respond(state, 'Usage: xgettext [OPTION] [INPUTFILE]...\n\nExtract translatable strings from given input files.\n');
        if ('version' in parsed) return this.respond(state, 'xgettext (GNU gettext-tools) 0.21\n');
        const o = parsed;
        if (o.files.length === 0) return this.fail(state, `xgettext: no input file given\n${TRY}`);
        const lang = o.language?.toLowerCase();
        if (lang && !['c', 'c++', 'objectivec', 'shell', 'sh'].includes(lang)) {
            return this.fail(state, `xgettext: language '${o.language}' unknown\n${TRY}`);
        }

        const warnings: string[] = [];
        const entries: PoEntry[] = [];
        const index = new Map<string, PoEntry>();
        const outName = o.output ?? `${o.domain}.po`;
        const outPath = o.dir && !outName.startsWith('/') && outName !== '-' ? `${o.dir}/${outName}` : outName;

        let header: PoEntry | null = null;
        /** References of empty msgids, which GNU attaches to the header entry. */
        const headerRefs: string[] = [];
        if (o.join && outPath !== '-') {
            const existing = readInput(context, outPath);
            if (existing.ok) {
                const prev = parsePo(existing.data, outPath);
                for (const e of prev.entries) {
                    if (e.msgid === '' && e.msgctxt === undefined) { header = e; continue; }
                    entries.push(e);
                    index.set(this.key(e.msgctxt, e.msgid), e);
                }
            }
        }

        for (const file of o.files) {
            const isShell = lang ? lang === 'shell' || lang === 'sh' : SHELL_EXT.test(file);
            if (!lang && !isShell && !C_EXT.test(file)) {
                const ext = /\.([^./]*)$/.exec(file)?.[1] ?? '';
                warnings.push(`xgettext: warning: file '${file}' extension '${ext}' is unknown; will try C\n`);
            }
            const input = readInput(context, file);
            if (!input.ok) return this.fail(state, warnings.join('') + `xgettext: error while opening "${file}" for reading: ${input.error.replace(/^.*: /, '')}\n`);
            const keywords = this.keywords(o, isShell);
            if (keywords.length === 0) return this.fail(state, `xgettext: xgettext cannot work without keywords to look for\n${TRY}`);
            const found: ExtractedMessage[] = isShell
                ? extractShell(input.data, keywords, (line, msg) => warnings.push(`${file}:${line}: ${msg}\n`))
                : extractC(input.data, keywords, o.commentTag);
            for (const m of found) {
                if (!o.fromCode && /[^\x00-\x7f]/.test(m.msgid + (m.msgidPlural ?? ''))) {
                    return this.fail(state, warnings.join('') + `xgettext: Non-ASCII string at ${file}:${m.line}.\n          Please specify the source encoding through --from-code.\n`);
                }
                if (m.msgid === '' && m.msgctxt === undefined && !o.omitHeader) {
                    if (o.location) headerRefs.push(`${file}:${m.line}`);
                    warnings.push(`${file}:${m.line}: warning: Empty msgid.  It is reserved by GNU gettext:\n${' '.repeat(file.length + String(m.line).length + 3)}gettext("") returns the header entry with\n${' '.repeat(file.length + String(m.line).length + 3)}meta information, not the empty string.\n`);
                    continue;
                }
                const ref = `${file}:${m.line}`;
                const key = this.key(m.msgctxt, m.msgid);
                let e = index.get(key);
                if (!e) {
                    e = { msgctxt: m.msgctxt, msgid: m.msgid, msgstr: [''], flags: [], references: [], comments: [], extracted: [], obsolete: false, line: m.line };
                    index.set(key, e);
                    entries.push(e);
                }
                if (m.msgidPlural !== undefined && e.msgidPlural === undefined) { e.msgidPlural = m.msgidPlural; e.msgstr = ['', '']; }
                if (o.location && !e.references.includes(ref)) e.references.push(ref);
                for (const c of m.comments) if (!e.extracted.includes(c)) e.extracted.push(c);
                const text = [m.msgid, m.msgidPlural ?? ''];
                if (!isShell && text.some(isCFormat) && !e.flags.includes('c-format')) e.flags.push('c-format');
                if (isShell && m.shFormat && text.some(isShFormat) && !e.flags.includes('sh-format')) e.flags.push('sh-format');
            }
        }

        if (o.sort === 'msgid') entries.sort((a, b) => (a.msgid < b.msgid ? -1 : a.msgid > b.msgid ? 1 : 0));
        if (o.sort === 'file') entries.sort((a, b) => (a.references[0] ?? '').localeCompare(b.references[0] ?? '', 'en', { numeric: true }));
        if (entries.length === 0 && !o.forcePo) return { output: '', stderr: warnings.join('') || undefined, exitCode: 0, newState: state };

        let text = '';
        if (!o.omitHeader) text += this.header(o, header, headerRefs, entries.some(e => e.msgidPlural !== undefined), entries.some(e => /[^\x00-\x7f]/.test(e.msgid)));
        text += entries.map(e => formatPoEntry(e, o.width, !o.location)).join('\n');

        if (outPath === '-') return { output: text, stderr: warnings.join('') || undefined, exitCode: 0, newState: state };
        try {
            const fs = context.fileSystemService;
            fs.writeFile(fs.resolveAbsolutePath(outPath, context.cwd), text, 'w');
        } catch (e) {
            return this.fail(state, warnings.join('') + `xgettext: cannot create output file "${outPath}": ${strerror(e)}\n`);
        }
        return { output: '', stderr: warnings.join('') || undefined, exitCode: 0, newState: state };
    }

    private key(ctx: string | undefined, msgid: string): string {
        return (ctx !== undefined ? ctx + '\x04' : '') + msgid;
    }

    private fail(state: TerminalState, stderr: string): CommandResponse {
        return { output: '', stderr, exitCode: 1, newState: state };
    }

    private keywords(o: Options, shell: boolean): KeywordSpec[] {
        const specs = [...(o.noDefaultKeywords ? [] : shell ? SHELL_KEYWORDS : C_KEYWORDS), ...o.keywords];
        const byName = new Map<string, KeywordSpec>();
        for (const s of specs) {
            const k = parseKeyword(s);
            if (k) byName.set(k.name, k);
        }
        return [...byName.values()];
    }

    private header(o: Options, existing: PoEntry | null, refs: string[], plural: boolean, utf8: boolean): string {
        if (existing) return formatPoEntry({ ...existing, references: [...existing.references, ...refs] }, o.width) + '\n';
        const d = new Date();
        const pad = (n: number) => String(n).padStart(2, '0');
        const date = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}+0000`;
        const pkg = o.packageName ?? 'PACKAGE';
        const fields = [
            `Project-Id-Version: ${o.packageName ? `${o.packageName}${o.packageVersion ? ' ' + o.packageVersion : ''}` : 'PACKAGE VERSION'}`,
            `Report-Msgid-Bugs-To: ${o.bugsAddress}`, `POT-Creation-Date: ${date}`, 'PO-Revision-Date: YEAR-MO-DA HO:MI+ZONE',
            'Last-Translator: FULL NAME <EMAIL@ADDRESS>', 'Language-Team: LANGUAGE <LL@li.org>', 'Language: ', 'MIME-Version: 1.0',
            `Content-Type: text/plain; charset=${utf8 || (o.fromCode && !/^(ascii|us-ascii|ansi_x3\.4-1968)$/i.test(o.fromCode)) ? 'UTF-8' : 'CHARSET'}`,
            'Content-Transfer-Encoding: 8bit',
            ...(plural ? ['Plural-Forms: nplurals=INTEGER; plural=EXPRESSION;'] : []),
        ];
        const comments = ['SOME DESCRIPTIVE TITLE.', `Copyright (C) YEAR ${o.copyrightHolder ?? "THE PACKAGE'S COPYRIGHT HOLDER"}`,
            `This file is distributed under the same license as the ${pkg} package.`, 'FIRST AUTHOR <EMAIL@ADDRESS>, YEAR.', ''];
        return comments.map(c => (c ? `# ${c}\n` : '#\n')).join('') + (refs.length ? `#: ${refs.join(' ')}\n` : '') + '#, fuzzy\nmsgid ""\nmsgstr ""\n' +
            fields.map(f => `"${f}\\n"\n`).join('') + '\n';
    }

    private parseArgs(args: string[], context: ProcessContext): Options | string | { help: true } | { version: true } {
        const o: Options = { domain: 'messages', join: false, location: true, commentTag: null, keywords: [], noDefaultKeywords: false,
            sort: 'none', width: 79, omitHeader: false, forcePo: false, bugsAddress: '', files: [] };
        const set = (name: string, value: string | undefined): string | null => {
            switch (name) {
                case 'o': case 'output': o.output = value; break;
                case 'd': case 'default-domain': o.domain = value!; break;
                case 'p': case 'output-dir': o.dir = value; break;
                case 'L': case 'language': o.language = value; break;
                case 'w': case 'width': o.width = Number(value) || 79; break;
                case 'from-code': o.fromCode = value; break;
                case 'package-name': o.packageName = value; break;
                case 'package-version': o.packageVersion = value; break;
                case 'msgid-bugs-address': o.bugsAddress = value ?? ''; break;
                case 'copyright-holder': o.copyrightHolder = value; break;
                case 'f': case 'files-from': {
                    const list = readInput(context, value);
                    if (!list.ok) return `xgettext: error while opening "${value}" for reading: ${list.error.replace(/^.*: /, '')}\n`;
                    o.files.push(...list.data.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#')));
                    break;
                }
                default: break;
            }
            return null;
        };
        for (let i = 0; i < args.length; i++) {
            const a = args[i];
            if (a === '--') { o.files.push(...args.slice(i + 1)); break; }
            if (a.startsWith('--')) {
                const [name, inline] = a.substring(2).split(/=(.*)/s, 2);
                if (name === 'help') return { help: true };
                if (name === 'version') return { version: true };
                if (LONG_VALUE.has(name)) {
                    const v = inline ?? args[++i];
                    if (v === undefined) return `xgettext: option '--${name}' requires an argument\n${TRY}`;
                    const err = set(name, v);
                    if (err) return err;
                    continue;
                }
                switch (name) {
                    case 'join-existing': o.join = true; break;
                    case 'no-location': o.location = false; break;
                    case 'add-location': o.location = true; break;
                    case 'add-comments': o.commentTag = inline ?? ''; break;
                    case 'keyword': if (inline === undefined) o.noDefaultKeywords = true; else o.keywords.push(inline); break;
                    case 'sort-output': o.sort = 'msgid'; break;
                    case 'sort-by-file': o.sort = 'file'; break;
                    case 'omit-header': o.omitHeader = true; break;
                    case 'no-wrap': o.width = Infinity; break;
                    case 'force-po': o.forcePo = true; break;
                    case 'c++': o.language = 'C++'; break;
                    case 'extract-all': case 'trigraphs': case 'foreign-user': case 'strict': case 'properties-output':
                    case 'stringtable-output': case 'escape': case 'no-escape': case 'indent': case 'debug': case 'check': case 'sentence-end':
                        break;
                    default: return `xgettext: unrecognized option '${a}'\n${TRY}`;
                }
                continue;
            }
            if (!a.startsWith('-') || a === '-') { o.files.push(a); continue; }
            for (let j = 1; j < a.length; j++) {
                const c = a[j];
                const rest = a.substring(j + 1);
                if (c === 'k') { if (rest) o.keywords.push(rest); else o.noDefaultKeywords = true; break; }
                if (c === 'c') { o.commentTag = rest; break; }
                if (SHORT_VALUE.includes(c)) {
                    const v = rest || args[++i];
                    if (v === undefined) return `xgettext: option requires an argument -- '${c}'\n${TRY}`;
                    const err = set(c, v);
                    if (err) return err;
                    break;
                }
                switch (c) {
                    case 'j': o.join = true; break;
                    case 'n': o.location = true; break;
                    case 's': o.sort = 'msgid'; break;
                    case 'F': o.sort = 'file'; break;
                    case 'C': o.language = 'C++'; break;
                    case 'a': case 'T': case 'E': case 'i': case 'e': break;
                    case 'h': return { help: true };
                    case 'V': return { version: true };
                    default: return `xgettext: invalid option -- '${c}'\n${TRY}`;
                }
            }
        }
        return o;
    }
}
