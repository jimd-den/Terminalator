/**
 * gettext - retrieve text string from messages object (POSIX, GNU gettext):
 *   gettext [-d textdomain] [-c context] [-e|-E] [[textdomain] msgid]
 *   gettext [-d textdomain] [-c context] [-e|-E] [-n] -s [msgid]...
 * The domain defaults to $TEXTDOMAIN; catalogs are looked up under
 * $TEXTDOMAINDIR (default /usr/share/locale) for the LANGUAGE / LC_ALL /
 * LC_MESSAGES / LANG languages. Untranslated text is printed as is.
 */
import { CommandResponse } from '../ICommand';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { Utility } from '../shared/Utility';
import { translate } from '../shared/MessageCatalog';

/** Options shared by gettext and ngettext. */
export interface GettextOptions {
    domain?: string;
    context?: string;
    escapes: boolean;
    noNewline: boolean;
    echo: boolean;
    operands: string[];
}

/**
 * Parses the gettext/ngettext command line; options end at the first operand. Returns an error message for an invalid option.
 */
export function parseGettextArgs(args: string[], allowEcho: boolean): GettextOptions | { error: string } | { help: true } | { version: true } {
    const o: GettextOptions = { escapes: false, noNewline: false, echo: false, operands: [] };
    const shorts = allowEcho ? 'd:c:eEnsh' : 'd:c:eEh';
    for (let i = 0; i < args.length; i++) {
        const a = args[i];
        if (a === '--') { o.operands.push(...args.slice(i + 1)); break; }
        if (a.startsWith('--')) {
            const [name, inline] = a.substring(2).split(/=(.*)/s, 2);
            const value = () => inline ?? args[++i];
            if (name === 'help') return { help: true };
            if (name === 'version') return { version: true };
            if (name === 'domain') o.domain = value();
            else if (name === 'context') o.context = value();
            else return { error: `unrecognized option '${a}'` };
            continue;
        }
        // Option parsing stops at the first operand (getopt "+" mode).
        if (!a.startsWith('-') || a === '-') { o.operands.push(...args.slice(i)); break; }
        for (let j = 1; j < a.length; j++) {
            const c = a[j];
            const idx = shorts.indexOf(c);
            if (idx === -1 || c === ':') return c === 'V' ? { version: true } : { error: `invalid option -- '${c}'` };
            if (shorts[idx + 1] === ':') {
                const v = j + 1 < a.length ? a.substring(j + 1) : args[++i];
                if (v === undefined) return { error: `option requires an argument -- '${c}'` };
                if (c === 'd') o.domain = v; else o.context = v;
                break;
            }
            if (c === 'h') return { help: true };
            if (c === 'e') o.escapes = true;
            else if (c === 'E') o.escapes = false;
            else if (c === 'n') o.noNewline = true;
            else if (c === 's') o.echo = true;
        }
    }
    return o;
}

/** GNU gettext's -e escapes: \b \c \f \n \r \t \v \\ and octal \0nn; others stay literal. */
export function expandGettextEscapes(s: string): { text: string; noNewline: boolean } {
    let noNewline = false;
    let text = '';
    for (let i = 0; i < s.length; i++) {
        if (s[i] !== '\\' || i + 1 >= s.length) { text += s[i]; continue; }
        const c = s[i + 1];
        const simple: Record<string, string> = { b: '\b', f: '\f', n: '\n', r: '\r', t: '\t', v: '\v', '\\': '\\' };
        if (c in simple) { text += simple[c]; i++; continue; }
        if (c === 'c') { noNewline = true; i++; continue; }
        if (/[0-7]/.test(c)) {
            let j = i + 1;
            let v = 0;
            while (j < s.length && j < i + 4 && /[0-7]/.test(s[j])) v = v * 8 + Number(s[j++]);
            text += String.fromCharCode(v & 0xff);
            i = j - 1;
            continue;
        }
        text += '\\';
    }
    return { text, noNewline };
}

export function gettextUsageError(state: TerminalState, name: string, message: string): CommandResponse {
    return { output: '', stderr: `${name}: ${message}\nTry '${name} --help' for more information.\n`, exitCode: 1, newState: state };
}

const HELP = `Usage: gettext [OPTION] [[TEXTDOMAIN] MSGID]
or:    gettext [OPTION] -s [MSGID]...

Display native language translation of a textual message.

  -d, --domain=TEXTDOMAIN   retrieve translated messages from TEXTDOMAIN
  -c, --context=CONTEXT     specify context for MSGID
  -e                        enable expansion of some escape sequences
  -n                        suppress trailing newline
  -E                        (ignored for compatibility)
  [TEXTDOMAIN] MSGID        retrieve translated message corresponding
                            to MSGID from TEXTDOMAIN
`;

export class GettextCommand extends Utility {
    readonly utility = 'gettext';

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const parsed = parseGettextArgs(args, true);
        if ('error' in parsed) return gettextUsageError(state, 'gettext', parsed.error);
        if ('help' in parsed) return this.respond(state, HELP);
        if ('version' in parsed) return this.respond(state, 'gettext (GNU gettext-runtime) 0.21\n');
        const o = parsed;
        let domain = o.domain ?? context.env.TEXTDOMAIN ?? '';
        let noNewline = o.noNewline;
        const lookup = (msgid: string) => {
            let id = msgid;
            if (o.escapes) {
                const r = expandGettextEscapes(msgid);
                id = r.text;
                if (r.noNewline) noNewline = true;
            }
            return translate(context, domain, id, { context: o.context }) ?? id;
        };

        if (o.echo) {
            const text = o.operands.map(lookup).join(' ');
            return this.respond(state, text + (noNewline ? '' : '\n'));
        }
        if (o.operands.length === 0) return this.respond(state, '', ['missing arguments'], 1);
        if (o.operands.length > 2) return this.respond(state, '', ['too many arguments'], 1);
        if (o.operands.length === 2) domain = o.operands[0];
        return this.respond(state, lookup(o.operands[o.operands.length - 1]));
    }
}
