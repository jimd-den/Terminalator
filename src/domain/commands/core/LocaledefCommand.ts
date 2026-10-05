/**
 * localedef - define locale environment (POSIX, glibc behaviour):
 *   localedef [-c] [-f charmap] [-i sourcefile] [-u code_set_name] name
 * The source (default: standard input) is compiled with the charmap
 * (default ANSI_X3.4-1968) and written as a locale directory: `name` itself
 * when it contains a slash, else /usr/lib/locale/<name> with a normalised
 * codeset (as glibc's --no-archive).
 *
 * Exit status: 0 success, 1 warnings (output written), 4 errors (no output
 * unless -c).
 */
import { CommandResponse } from '../ICommand';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { Utility } from '../shared/Utility';
import { getStdinAsString } from '../../entities/ProcessContext';
import { categoryFile, I18N_DIR, listDirectory, LOCALE_DIR, readText } from '../shared/Locales';
import { statPath } from '../shared/FileInfo';
import { strerror } from '../shared/PathOps';
import { normalizeLocaleName } from '../../utils/i18n/LocaleName';
import { compileLocale, LOCALE_CATEGORIES, renderCategory } from '../../utils/i18n/LocaleDefinition';

const HELP = `Usage: localedef [OPTION...] NAME
  or:  localedef [OPTION...] --add-to-archive NAME
  or:  localedef [OPTION...] --delete-from-archive NAME
  or:  localedef [OPTION...] --list-archive [FILE]
Compile locale specification

 Input Files:
  -f, --charmap=FILE         Symbolic character names defined in FILE
  -i, --inputfile=FILE       Source definitions are found in FILE
  -u, --repertoire-map=FILE  FILE contains mapping from symbolic names to UCS4
                             values

 Output control:
  -c, --force                Create output even if warning messages were
                             issued
      --no-archive           Do not use existing archive, create new one
      --no-warnings          Comma-separated list of warnings to disable
      --quiet                Suppress warnings and information messages
  -v, --verbose              Print more messages

  -?, --help                 Give this help list
      --usage                Give a short usage message
  -V, --version              Print program version
`;
const TRY = "Try `localedef --help' or `localedef --usage' for more information.\n";
const DEFAULT_CHARMAP = 'ANSI_X3.4-1968';

export class LocaledefCommand extends Utility {
    readonly utility = 'localedef';

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        let charmapName: string | undefined;
        let input: string | undefined;
        let force = false;
        let quiet = false;
        let listArchive = false;
        const operands: string[] = [];
        for (let i = 0; i < args.length; i++) {
            const a = args[i];
            const long = /^--([^=]+)(?:=(.*))?$/.exec(a);
            if (a === '--') { operands.push(...args.slice(i + 1)); break; }
            if (long) {
                const [, name, inline] = long;
                const value = () => inline ?? args[++i];
                switch (name) {
                    case 'help': return this.respond(state, HELP);
                    case 'usage': return this.respond(state, 'Usage: localedef [-cv?V] [-f FILE] [-i FILE] [-u FILE] NAME\n');
                    case 'version': return this.respond(state, 'localedef (GNU libc) 2.39\n');
                    case 'charmap': charmapName = value(); break;
                    case 'inputfile': input = value(); break;
                    case 'repertoire-map': case 'alias-file': case 'prefix': case 'no-warnings': case 'warnings': value(); break;
                    case 'force': force = true; break;
                    case 'quiet': quiet = true; break;
                    case 'list-archive': listArchive = true; break;
                    case 'verbose': case 'no-archive': case 'add-to-archive': case 'delete-from-archive': case 'replace':
                    case 'posix': case 'big-endian': case 'little-endian': case 'no-hard-links': break;
                    default: return this.fail(state, `localedef: unrecognized option '${a}'\n` + TRY, 4);
                }
                continue;
            }
            if (a.startsWith('-') && a !== '-') {
                for (let j = 1; j < a.length; j++) {
                    const f = a[j];
                    if ('fiuA'.includes(f)) {
                        const v = j + 1 < a.length ? a.substring(j + 1) : args[++i];
                        if (v === undefined) return this.fail(state, `localedef: option requires an argument -- '${f}'\n` + TRY, 4);
                        if (f === 'f') charmapName = v;
                        if (f === 'i') input = v;
                        break;
                    }
                    if (f === 'c') force = true;
                    else if (f === '?') return this.respond(state, HELP);
                    else if (f === 'V') return this.respond(state, 'localedef (GNU libc) 2.39\n');
                    else if (f !== 'v') return this.fail(state, `localedef: invalid option -- '${f}'\n` + TRY, 4);
                }
                continue;
            }
            operands.push(a);
        }
        if (listArchive) return this.respond(state, '');
        // glibc prints this hint on standard output.
        if (operands.length !== 1) return { output: TRY, exitCode: 4, newState: state };

        const messages: string[] = [];
        let errors = 0;
        const error = (msg: string) => { messages.push(`[error] ${msg}\n`); errors++; };

        // A missing charmap is an error, but glibc still compiles with the default one.
        let charmap = this.findCharmap(context, charmapName ?? DEFAULT_CHARMAP);
        if (!charmap) {
            error(`character map file \`${charmapName}' not found: No such file or directory`);
            charmap = DEFAULT_CHARMAP;
        }

        let source: string | null;
        if (input === undefined) {
            source = getStdinAsString(context) ?? '';
            if (!source) { error("cannot open locale definition file `(null)'"); source = null; }
        } else {
            source = this.findSource(context, input);
            if (source === null) error(`cannot open locale definition file \`${input}': No such file or directory`);
        }
        if (source === null) return this.fail(state, messages.join(''), 4);

        const result = compileLocale(source, input ?? '<stdin>', charmap, name => this.findSource(context, name));
        for (const e of result.errors) error(e);
        if (!quiet) for (const w of result.warnings) messages.push(`[warning] ${w}\n`);
        if (result.errors.length && !force) return this.fail(state, messages.join(''), 4);

        const name = operands[0];
        const dir = name.includes('/') ? context.fileSystemService.resolveAbsolutePath(name, context.cwd)
            : `${LOCALE_DIR}/${normalizeLocaleName(name)}`;
        try {
            const fs = context.fileSystemService;
            if (statPath(context, dir)?.kind !== 'directory') fs.mkdir(dir);
            if (statPath(context, `${dir}/LC_MESSAGES`)?.kind !== 'directory') fs.mkdir(`${dir}/LC_MESSAGES`);
            for (const cat of LOCALE_CATEGORIES) fs.writeFile(categoryFile(dir, cat), renderCategory(result.tables[cat]), 'w');
        } catch (e) {
            messages.push(`[error] cannot write output files to \`${dir}/': ${strerror(e)}\n`);
            return this.fail(state, messages.join(''), 4);
        }
        const status = errors ? 4 : result.warnings.length ? 1 : 0;
        return { output: '', stderr: messages.join('') || undefined, exitCode: status, newState: state };
    }

    private fail(state: TerminalState, stderr: string, status: number): CommandResponse {
        return { output: '', stderr: stderr || undefined, exitCode: status, newState: state };
    }

    /** Locale definition source text: a path, or a name in /usr/share/i18n/locales. */
    private findSource(context: ProcessContext, name: string): string | null {
        return readText(context, name) ?? (name.includes('/') ? null : readText(context, `${I18N_DIR}/locales/${name}`));
    }

    /** The code set name of a charmap given by path or file name (glibc does not resolve aliases here). */
    private findCharmap(context: ProcessContext, name: string): string | null {
        const header = (text: string | null) => (text === null ? null : /^<code_set_name>\s+(\S+)/m.exec(text)?.[1] ?? name);
        const direct = header(readText(context, name)) ?? (name.includes('/') ? null : header(readText(context, `${I18N_DIR}/charmaps/${name}`)));
        if (direct) return direct;
        return null;
    }
}
