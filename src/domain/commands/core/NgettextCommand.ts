/**
 * ngettext - retrieve text string from messages object with plural form
 * (POSIX, GNU gettext):
 *   ngettext [-d textdomain] [-c context] [-e|-E] [textdomain] msgid msgid_plural count
 * The plural form is chosen by the catalog's Plural-Forms; untranslated,
 * msgid is printed for count 1 and msgid_plural otherwise. A count that is
 * not a number selects the plural.
 */
import { CommandResponse } from '../ICommand';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { Utility } from '../shared/Utility';
import { translate } from '../shared/MessageCatalog';
import { expandGettextEscapes, gettextUsageError, parseGettextArgs } from './GettextCommand';

const HELP = `Usage: ngettext [OPTION] [TEXTDOMAIN] MSGID MSGID-PLURAL COUNT

Display native language translation of a textual message whose grammatical
form depends on a number.

  -d, --domain=TEXTDOMAIN   retrieve translated message from TEXTDOMAIN
  -c, --context=CONTEXT     specify context for MSGID
  -e                        enable expansion of some escape sequences
  -E                        (ignored for compatibility)
`;

/** strtoul(3) as ngettext uses it: an invalid count yields 99 (plural). */
export function parseCount(s: string): bigint {
    const m = /^[ \t\n\v\f\r]*([-+]?)([0-9]+)$/.exec(s);
    if (!m) return 99n;
    const v = BigInt.asUintN(64, BigInt(m[2]));
    if (BigInt(m[2]) > 0xffffffffffffffffn) return 99n;
    return m[1] === '-' ? BigInt.asUintN(64, -v) : v;
}

export class NgettextCommand extends Utility {
    readonly utility = 'ngettext';

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const parsed = parseGettextArgs(args, false);
        if ('error' in parsed) return gettextUsageError(state, 'ngettext', parsed.error);
        if ('help' in parsed) return this.respond(state, HELP);
        if ('version' in parsed) return this.respond(state, 'ngettext (GNU gettext-runtime) 0.21\n');
        const o = parsed;
        if (o.operands.length < 3) return this.respond(state, '', ['missing arguments'], 1);
        if (o.operands.length > 4) return this.respond(state, '', ['too many arguments'], 1);
        const ops = o.operands;
        const domain = ops.length === 4 ? ops[0] : o.domain ?? context.env.TEXTDOMAIN ?? '';
        const [rawId, rawPlural, count] = ops.slice(ops.length - 3);
        const msgid = o.escapes ? expandGettextEscapes(rawId).text : rawId;
        const msgidPlural = o.escapes ? expandGettextEscapes(rawPlural).text : rawPlural;
        const n = parseCount(count);
        const found = translate(context, domain, msgid, { context: o.context, plural: { msgidPlural, n } });
        return this.respond(state, found ?? (n === 1n ? msgid : msgidPlural));
    }
}
