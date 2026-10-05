/**
 * mailx - process messages (POSIX mailx).
 *
 *   Send mode:    mailx [-s subject] [-c addresses] [-b addresses] address...
 *   Receive mode: mailx -e
 *                 mailx [-HiNn] [-F] [-u user]
 *                 mailx -f [-HiNn] [-F] [file]
 *
 * Send mode reads the message body from standard input and hands the
 * message to the local mailer (see Mailbox), which appends it to
 * /var/mail/<user> in mbox format or bounces it to the sender.
 * Receive mode opens the system mailbox (or a folder), writes the header
 * summary unless -N, and reads commands from standard input: p/t (print),
 * h (headers), f (from), d/u (delete/undelete), n/+/- (move), s/w (save to
 * a folder with/without headers), = (current number), q (quit, keeping
 * changes and moving read messages to ~/mbox) and x (exit unchanged).
 */
import { Utility } from '../shared/Utility';
import { ProcessContext, getStdinAsString } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../entities/Command';
import { getopt } from '../shared/InputFiles';
import { strerror } from '../shared/PathOps';
import { Spool, asctime, reply, rfc5322Date } from '../shared/Spool';
import {
    LocalMailer, MailMessage, MAIL_SPOOL, addressOf, formatForDisplay, formatMbox, header, parseMbox, setHeader,
} from '../shared/Mailbox';

interface Entry {
    msg: MailMessage;
    deleted: boolean;
    read: boolean;
    saved: boolean;
    preserved: boolean;
    wasNew: boolean;
}

const HELP = '    Mail   Commands\n' +
    't <message list>\t\ttype messages\n' +
    'n\t\t\t\tgoto and type next message\n' +
    'e <message list>\t\tedit messages\n' +
    'f <message list>\t\tgive head lines of messages\n' +
    'd <message list>\t\tdelete messages\n' +
    's <message list> file\t\tappend messages to file\n' +
    'u <message list>\t\tundelete messages\n' +
    'h\t\t\t\tprint out active message headers\n' +
    'q\t\t\t\tquit, saving unresolved messages in mbox\n' +
    'x\t\t\t\tquit, do not remove system mailbox\n' +
    '=\t\t\t\tprint current message number\n';

export class MailxCommand extends Utility {
    readonly utility = 'mailx';

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const { opts, operands, error } = getopt(args, 'es:c:b:r:fu:HiNnFdIv');
        if (error) return reply(state, '', `mailx: ${error}\nusage: mailx [-eiIUdEFntBDNHRV~] [-T FILE] [-u USER] [-h hops] [-r address] [-s SUBJECT] [-a FILE] [-q FILE] [-f FILE] [-A ACCOUNT] [-b USERS] [-c USERS] [-S OPTION] users\n`, 1);
        const spool = new Spool(context);
        if (operands.length && !opts.has('f')) return this.send(spool, context, state, opts, operands);
        if (opts.has('s') || opts.has('c') || opts.has('b')) {
            return reply(state, '', 'mailx: You must specify direct recipients with -s, -c, or -b.\n', 1);
        }

        // Receive mode.
        let folder: string;
        let system = false;
        if (opts.has('f')) {
            const home = context.env.HOME ?? '/';
            folder = operands[0] ? context.fileSystemService.resolveAbsolutePath(operands[0].replace(/^~(?=\/|$)/, home), context.cwd)
                : `${home}/mbox`;
        } else {
            const user = (opts.get('u') as string | undefined) ?? spool.userName;
            folder = context.env.MAIL && !opts.has('u') ? context.env.MAIL : `${MAIL_SPOOL}/${user}`;
            system = true;
        }
        let text: string;
        try {
            const node = context.fileSystemService.resolve(folder, '/');
            text = node ? context.fileSystemService.readFile(folder, '/') : '';
        } catch (e) {
            if (opts.has('e')) return reply(state, '', '', 1);
            return reply(state, '', `mailx: ${folder}: ${strerror(e)}\n`, 1);
        }
        const messages = parseMbox(text);
        if (opts.has('e')) return reply(state, '', '', messages.length ? 0 : 1);
        if (!messages.length) {
            const who = (opts.get('u') as string | undefined) ?? spool.userName;
            return reply(state, '', system ? `No mail for ${who}\n` : `"${folder}": empty file\n`, 0);
        }
        const session = new MailSession(context, spool, folder, system, messages);
        if (opts.has('H')) return reply(state, session.headers(true), '', 0);
        return session.run(state, getStdinAsString(context) ?? '', !opts.has('N'));
    }

    private send(spool: Spool, context: ProcessContext, state: TerminalState, opts: Map<string, string | true>, to: string[]): CommandResponse {
        const list = (v: string | true | undefined) => typeof v === 'string' ? v.split(/[,\s]+/).filter(Boolean) : [];
        const cc = list(opts.get('c'));
        const bcc = list(opts.get('b'));
        const now = new Date();
        const host = spool.hostname();
        const user = spool.userName;
        const realName = spool.users.byName(user)?.realName;
        const from = (opts.get('r') as string | undefined) ?? (realName ? `${realName} <${user}@${host}>` : `${user}@${host}`);
        let body = getStdinAsString(context) ?? '';
        let err = '';
        if (body === '') err += "Null message body; hope that's ok\n";
        else if (!body.endsWith('\n')) body += '\n';

        const msg: MailMessage = { envelope: `${addressOf(from)}`, date: asctime(now), headers: [], body };
        if (!msg.envelope.includes('@')) msg.envelope += `@${host}`;
        setHeader(msg, 'Return-Path', `<${msg.envelope}>`);
        setHeader(msg, 'To', to.join(', '));
        if (cc.length) setHeader(msg, 'Cc', cc.join(', '));
        if (typeof opts.get('s') === 'string') setHeader(msg, 'Subject', opts.get('s') as string);
        const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}` +
            `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
        setHeader(msg, 'Message-Id', `<${stamp}.${context.pid ?? 4242}@${host}>`);
        setHeader(msg, 'Date', rfc5322Date(now));
        setHeader(msg, 'From', from);
        new LocalMailer(spool).send(msg, [...to, ...cc, ...bcc], now);
        return reply(state, '', err, 0);
    }
}

/** A receive-mode session over one folder. */
class MailSession {
    private entries: Entry[];
    private current = 1;
    private out = '';

    constructor(private context: ProcessContext, private spool: Spool, private folder: string, private system: boolean, messages: MailMessage[]) {
        this.entries = messages.map(msg => {
            const status = header(msg, 'Status') ?? '';
            return { msg, deleted: false, read: status.includes('R'), saved: false, preserved: false, wasNew: !status.includes('O') };
        });
        const firstNew = this.entries.findIndex(e => !e.read);
        this.current = firstNew >= 0 ? firstNew + 1 : 1;
    }

    private get count(): number { return this.entries.length; }

    /** The header summary line of message n (1-based). */
    private headline(n: number): string {
        const e = this.entries[n - 1];
        const m = e.msg;
        const state = e.deleted ? 'D' : e.saved ? '*' : e.preserved ? 'P' : !e.read ? (e.wasNew ? 'N' : 'U') : ' ';
        const raw = formatMbox(m);
        const lines = raw.split('\n').length - 2;
        const from = addressOf(header(m, 'From') ?? m.envelope);
        const date = m.date.substring(0, 16);
        const counts = `${String(lines).padStart(3)}/${String(raw.length).padEnd(5)}`;
        const subject = header(m, 'Subject') ?? '';
        return `${n === this.current ? '>' : ' '}${state}${String(n).padStart(3)} ${from.padEnd(20).substring(0, 20)}  ${date} ${counts} ${subject}`.replace(/\s+$/, '');
    }

    headers(withIntro: boolean): string {
        let s = '';
        if (withIntro) {
            const fresh = this.entries.filter(e => e.wasNew && !e.read).length;
            const unread = this.entries.filter(e => !e.wasNew && !e.read).length;
            s += `"${this.folder}": ${this.count} message${this.count === 1 ? '' : 's'}` +
                (fresh ? ` ${fresh} new` : '') + (unread ? ` ${unread} unread` : '') + '\n';
        }
        for (let n = 1; n <= this.count; n++) if (!this.entries[n - 1].deleted) s += this.headline(n) + '\n';
        return s;
    }

    /** Resolves a message list ("1 3-5 $ * . ^ :n :u"); null when invalid. */
    private messageList(words: string[], undeleted = true): number[] | null {
        const ok = (n: number) => n >= 1 && n <= this.count && (!undeleted || !this.entries[n - 1].deleted);
        if (!words.length) return ok(this.current) ? [this.current] : [];
        const out: number[] = [];
        for (const w of words) {
            let m: RegExpExecArray | null;
            const live = Array.from({ length: this.count }, (_, i) => i + 1).filter(ok);
            if (w === '*') out.push(...live);
            else if (w === '$') { if (live.length) out.push(live[live.length - 1]); }
            else if (w === '^') { if (live.length) out.push(live[0]); }
            else if (w === '.') out.push(this.current);
            else if (w === ':n') out.push(...live.filter(n => this.entries[n - 1].wasNew && !this.entries[n - 1].read));
            else if (w === ':u') out.push(...live.filter(n => !this.entries[n - 1].read));
            else if ((m = /^(\d+)-(\d+)$/.exec(w))) { for (let n = +m[1]; n <= +m[2]; n++) if (ok(n)) out.push(n); }
            else if (/^\d+$/.test(w)) {
                const n = +w;
                if (n < 1 || n > this.count) { this.out += `${n}: Invalid message number\n`; return null; }
                if (!ok(n)) { this.out += `${n}: Inappropriate message\n`; return null; }
                out.push(n);
            } else {
                const who = w.toLowerCase();
                out.push(...live.filter(n => addressOf(header(this.entries[n - 1].msg, 'From') ?? this.entries[n - 1].msg.envelope).toLowerCase().includes(who)));
            }
        }
        return out;
    }

    private print(n: number): void {
        const e = this.entries[n - 1];
        this.out += `Message ${n}:\nFrom ${e.msg.envelope}  ${e.msg.date}\n` + formatForDisplay(e.msg) + '\n';
        e.read = true;
        this.current = n;
    }

    private save(list: number[], target: string, withHeaders: boolean): void {
        const home = this.context.env.HOME ?? '/';
        const path = this.context.fileSystemService.resolveAbsolutePath(target.replace(/^~(?=\/|$)/, home), this.context.cwd);
        const existed = this.context.fileSystemService.resolve(path, '/') !== null;
        const data = list.map(n => withHeaders ? formatMbox(this.entries[n - 1].msg) : this.entries[n - 1].msg.body).join('');
        try {
            this.context.fileSystemService.writeFile(path, data, 'a', undefined, undefined, '/');
        } catch (e) {
            this.out += `${target}: ${strerror(e)}\n`;
            return;
        }
        const lines = data.split('\n').length - 1;
        this.out += `"${target}" [${existed ? 'Appended' : 'New file'}] ${lines}/${data.length}\n`;
        for (const n of list) { this.entries[n - 1].saved = true; this.entries[n - 1].read = true; }
    }

    run(state: TerminalState, input: string, summary: boolean): CommandResponse {
        if (summary) this.out += this.headers(true);
        const lines = input.split('\n');
        if (input.endsWith('\n')) lines.pop();
        for (const raw of lines) {
            const line = raw.trim();
            if (line === '' ) continue;
            const m = /^([a-zA-Z]+|[=?!+\-|#]|\d+(?:-\d+)?|[$^.*])\s*(.*)$/.exec(line);
            const cmd = m ? m[1] : line;
            const words = (m ? m[2] : '').split(/\s+/).filter(Boolean);
            if (/^\d+$/.test(cmd) || cmd === '$' || cmd === '^' || cmd === '.') {
                const list = this.messageList([cmd]);
                if (list && list.length) this.print(list[0]);
                continue;
            }
            switch (cmd) {
                case 'p': case 'print': case 't': case 'type': case 'P': case 'Print': case 'T': case 'Type': {
                    const list = this.messageList(words);
                    if (list === null) break;
                    if (!list.length) { this.out += 'No applicable messages\n'; break; }
                    list.forEach(n => this.print(n));
                    break;
                }
                case 'n': case 'next': case '+': {
                    const next = this.entries.findIndex((e, i) => i + 1 > this.current && !e.deleted);
                    if (next < 0) { this.out += 'At EOF\n'; break; }
                    this.print(next + 1);
                    break;
                }
                case '-': case 'previous': {
                    let prev = -1;
                    for (let i = this.current - 2; i >= 0; i--) if (!this.entries[i].deleted) { prev = i; break; }
                    if (prev < 0) { this.out += 'Referencing before 1\n'; break; }
                    this.print(prev + 1);
                    break;
                }
                case 'h': case 'headers': case 'z':
                    this.out += this.headers(false);
                    break;
                case 'f': case 'from': {
                    const list = this.messageList(words);
                    if (list) list.forEach(n => { this.out += this.headline(n) + '\n'; });
                    break;
                }
                case 'd': case 'delete': case 'dp': case 'dt': {
                    const list = this.messageList(words);
                    if (!list) break;
                    list.forEach(n => { this.entries[n - 1].deleted = true; });
                    const next = this.entries.findIndex((e, i) => i + 1 > (list[list.length - 1] ?? this.current) && !e.deleted);
                    if (next >= 0) this.current = next + 1;
                    if (cmd === 'dp' || cmd === 'dt') {
                        if (next >= 0) this.print(next + 1); else this.out += 'At EOF\n';
                    }
                    break;
                }
                case 'u': case 'undelete': {
                    const list = this.messageList(words, false);
                    if (list) list.forEach(n => { this.entries[n - 1].deleted = false; this.current = n; });
                    break;
                }
                case 'pre': case 'preserve': case 'ho': case 'hold': {
                    const list = this.messageList(words);
                    if (list) list.forEach(n => { this.entries[n - 1].preserved = true; });
                    break;
                }
                case 's': case 'save': case 'w': case 'write': case 'S': case 'Save': {
                    const file = words.length ? words[words.length - 1] : (cmd === 's' || cmd === 'save' ? 'mbox' : '');
                    if (!file) { this.out += 'No file specified\n'; break; }
                    const list = this.messageList(words.slice(0, -1));
                    if (list && list.length) this.save(list, file, !(cmd === 'w' || cmd === 'write'));
                    break;
                }
                case '=':
                    this.out += `${this.current}\n`;
                    break;
                case '?': case 'help':
                    this.out += HELP;
                    break;
                case '#':
                    break;
                case 'x': case 'xit': case 'ex': case 'exit':
                    return reply(state, this.out, '', 0);
                case 'q': case 'quit':
                    return this.quit(state);
                default:
                    this.out += `Unknown command: "${cmd}"\n`;
            }
        }
        return this.quit(state);
    }

    /** quit: writes back the folder; read messages of the system mailbox go to ~/mbox. */
    private quit(state: TerminalState): CommandResponse {
        const keep: Entry[] = [];
        const toMbox: Entry[] = [];
        for (const e of this.entries) {
            if (e.deleted) continue;
            if (this.system && e.read && !e.preserved && !e.saved) toMbox.push(e);
            else if (this.system && e.saved && !e.preserved) continue;
            else keep.push(e);
        }
        const fs = this.context.fileSystemService;
        const stamp = (e: Entry) => {
            if (e.read) setHeader(e.msg, 'Status', 'RO');
            else setHeader(e.msg, 'Status', 'O');
            return formatMbox(e.msg);
        };
        try {
            if (toMbox.length) {
                const mbox = `${this.context.env.HOME ?? '/'}/mbox`;
                fs.writeFile(mbox, toMbox.map(stamp).join(''), 'a', undefined, undefined, '/');
                this.out += `Saved ${toMbox.length} message${toMbox.length === 1 ? '' : 's'} in ${mbox}\n`;
            }
            const unchanged = keep.length === this.entries.length && !toMbox.length;
            fs.writeFile(this.folder, keep.map(stamp).join(''), 'w', undefined, undefined, '/');
            if (keep.length && this.system) this.out += `Held ${keep.length} message${keep.length === 1 ? '' : 's'} in ${this.folder}\n`;
            else if (!unchanged && !this.system && keep.length) this.out += `"${this.folder}" complete\n`;
        } catch (e) {
            return reply(state, this.out, `mailx: ${this.folder}: ${strerror(e)}\n`, 1);
        }
        return reply(state, this.out, '', 0);
    }
}
