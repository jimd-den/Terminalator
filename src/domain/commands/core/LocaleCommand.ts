/**
 * locale - get locale-specific information (POSIX, glibc behaviour):
 *   locale [-a|-m]
 *   locale [-ck] name...
 * With no operands, the locale environment (LANG, LC_*, LC_ALL) is listed;
 * values not set explicitly are shown quoted. A name is a category (all its
 * keywords) or a keyword; -c prefixes the category name, -k prints
 * keyword="value". -v adds details to -a.
 */
import { CommandResponse } from '../ICommand';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { Utility } from '../shared/Utility';
import { currentTables, effectiveLocale, installedCharmaps, installedLocales, loadCategory, LOCALE_DIR, localeAvailable } from '../shared/Locales';
import { isCategory, LOCALE_CATEGORIES, plainValue } from '../../utils/i18n/LocaleDefinition';

const USAGE = `Usage: locale [-ckv?V] [--category-name] [--keyword-name] [--verbose] [--help]
            [--usage] [--version] NAME
  or:  locale [OPTION...] [-a|-m]
`;
const HELP = `Usage: locale [OPTION...] NAME
  or:  locale [OPTION...] [-a|-m]
Get locale-specific information.

 System information:
  -a, --all-locales          Write names of available locales
  -m, --charmaps             Write names of available charmaps

 Modify output format:
  -c, --category-name        Write names of selected categories
  -k, --keyword-name         Write names of selected keywords
  -v, --verbose              Print more information

  -?, --help                 Give this help list
      --usage                Give a short usage message
  -V, --version              Print program version
`;
const LONG: Record<string, string> = { 'all-locales': 'a', charmaps: 'm', 'category-name': 'c', 'keyword-name': 'k', verbose: 'v', help: '?', version: 'V' };

export class LocaleCommand extends Utility {
    readonly utility = 'locale';

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const flags = new Set<string>();
        const names: string[] = [];
        for (let i = 0; i < args.length; i++) {
            const a = args[i];
            if (a === '--') { names.push(...args.slice(i + 1)); break; }
            if (a.startsWith('--')) {
                if (a === '--usage') return this.respond(state, USAGE);
                const f = LONG[a.substring(2)];
                if (!f) return this.badUsage(state, `unrecognized option '${a}'`);
                flags.add(f);
            } else if (a.startsWith('-') && a !== '-') {
                for (const f of a.substring(1)) {
                    if (!'amckv?V'.includes(f)) return this.badUsage(state, `invalid option -- '${f}'`);
                    flags.add(f);
                }
            } else names.push(a);
        }
        if (flags.has('?')) return this.respond(state, HELP);
        if (flags.has('V')) return this.respond(state, 'locale (GNU libc) 2.39\n');
        if (flags.has('a')) return this.respond(state, this.listLocales(context, flags.has('v')));
        if (flags.has('m')) return this.respond(state, installedCharmaps(context).map(n => n + '\n').join(''));

        const warnings = this.checkEnvironment(context);
        const done = (out: string, status: number, error?: string): CommandResponse => {
            const lines = error ? [...warnings, `locale: ${error}`] : warnings;
            return { output: out, stderr: lines.length ? lines.join('\n') + '\n' : undefined, exitCode: status, newState: state };
        };
        if (names.length === 0) return done(this.environment(context), 0);

        const tables = currentTables(context);
        let out = '';
        for (const name of names) {
            if (isCategory(name)) {
                if (flags.has('c')) out += name + '\n';
                for (const [k, v] of tables[name]) out += flags.has('k') ? `${k}=${v}\n` : plainValue(v) + '\n';
                continue;
            }
            const cat = LOCALE_CATEGORIES.find(c => tables[c].some(([k]) => k === name));
            if (!cat) return done(out, 1, `unknown name "${name}"`);
            const value = tables[cat].find(([k]) => k === name)![1];
            if (flags.has('c')) out += cat + '\n';
            out += flags.has('k') ? `${name}=${value}\n` : plainValue(value) + '\n';
        }
        return done(out, 0);
    }

    private badUsage(state: TerminalState, message: string): CommandResponse {
        return { output: '', stderr: `locale: ${message}\nTry \`locale --help' or \`locale --usage' for more information.\n`, exitCode: 64, newState: state };
    }

    /** setlocale(LC_CTYPE/LC_MESSAGES/LC_ALL, "") failures, as glibc's locale reports them. */
    private checkEnvironment(context: ProcessContext): string[] {
        const env = context.env;
        const ok = (cat: typeof LOCALE_CATEGORIES[number]) => localeAvailable(context, effectiveLocale(env, cat), cat);
        const warnings: string[] = [];
        if (!ok('LC_CTYPE')) warnings.push('Cannot set LC_CTYPE to default locale: No such file or directory');
        if (!ok('LC_MESSAGES')) warnings.push('Cannot set LC_MESSAGES to default locale: No such file or directory');
        if (!LOCALE_CATEGORIES.every(ok)) warnings.push('Cannot set LC_ALL to default locale: No such file or directory');
        // glibc's locale points at LOCPATH when it may explain the failure.
        if (warnings.length && env.LOCPATH) return [...warnings.map(w => `locale: ${w}`), `warning: The LOCPATH variable is set to "${env.LOCPATH}"`];
        return warnings.map(w => `locale: ${w}`);
    }

    private environment(context: ProcessContext): string {
        const env = context.env;
        const lang = env.LANG ?? '';
        let out = `LANG=${lang}\nLANGUAGE=${env.LANGUAGE ?? ''}\n`;
        for (const cat of LOCALE_CATEGORIES) {
            const own = env[cat];
            if (!env.LC_ALL && own) out += `${cat}=${own}\n`;
            else out += `${cat}="${env.LC_ALL || own || lang || 'POSIX'}"\n`;
        }
        return out + `LC_ALL=${env.LC_ALL ?? ''}\n`;
    }

    private listLocales(context: ProcessContext, verbose: boolean): string {
        const names = installedLocales(context);
        if (!verbose) return names.map(n => n + '\n').join('');
        let out = '';
        for (const name of names.filter(n => n !== 'C' && n !== 'POSIX')) {
            const ident = loadCategory(context, name, 'LC_IDENTIFICATION') ?? [];
            const get = (k: string) => plainValue(ident.find(([key]) => key === k)?.[1] ?? '');
            const codeset = plainValue(loadCategory(context, name, 'LC_CTYPE')?.find(([k]) => k === 'charmap')?.[1] ?? '');
            out += `locale: ${name.padEnd(15)} directory: ${LOCALE_DIR}/${name}\n${'-'.repeat(79)}\n`;
            for (const [label, value] of [['title', get('title')], ['source', get('source')], ['address', get('address')],
                ['email', get('email')], ['language', get('language')], ['territory', get('territory')], ['revision', get('revision')],
                ['date', get('date')], ['codeset', codeset]]) {
                if (value) out += `${label.padStart(9)} | ${value}\n`;
            }
            out += '\n';
        }
        return out;
    }
}
