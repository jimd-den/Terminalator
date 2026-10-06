import { Spool, asctime, rfc5322Date } from './Spool';

/**
 * Mailbox - mbox(5) mail folders and local delivery, standing in for the
 * system's mail transfer agent. Messages start with a postmark line
 * ("From sender  Sun Oct  4 19:30:00 2026"); body lines beginning with
 * "From " are quoted as ">From "; each message ends with a blank line.
 * Users' system mailboxes are /var/mail/<user> (mode 0660, group mail).
 */
export interface MailMessage {
    /** The sender on the postmark line. */
    envelope: string;
    /** The asctime() date of the postmark line. */
    date: string;
    headers: [string, string][];
    body: string;
}

export const MAIL_SPOOL = '/var/mail';
const MAIL_GID = 8;
const POSTMARK = /^From (\S+) +((?:Mon|Tue|Wed|Thu|Fri|Sat|Sun) \w{3} [ \d]\d \d\d:\d\d:\d\d \d{4})\s*$/;

export function header(m: MailMessage, name: string): string | undefined {
    return m.headers.find(([k]) => k.toLowerCase() === name.toLowerCase())?.[1];
}

export function setHeader(m: MailMessage, name: string, value: string): void {
    const h = m.headers.find(([k]) => k.toLowerCase() === name.toLowerCase());
    if (h) h[1] = value;
    else m.headers.push([name, value]);
}

/** Splits an mbox file into messages. */
export function parseMbox(text: string): MailMessage[] {
    const messages: MailMessage[] = [];
    const lines = text.split('\n');
    let cur: { envelope: string; date: string; lines: string[] } | null = null;
    const finish = () => {
        if (!cur) return;
        while (cur.lines.length && cur.lines[cur.lines.length - 1] === '') cur.lines.pop();
        const sep = cur.lines.indexOf('');
        const headLines = sep < 0 ? cur.lines : cur.lines.slice(0, sep);
        const bodyLines = sep < 0 ? [] : cur.lines.slice(sep + 1);
        const headers: [string, string][] = [];
        for (const l of headLines) {
            if (/^[ \t]/.test(l) && headers.length) headers[headers.length - 1][1] += '\n' + l;
            else {
                const i = l.indexOf(':');
                if (i > 0) headers.push([l.substring(0, i), l.substring(i + 1).trim()]);
            }
        }
        const body = bodyLines.map(l => l.replace(/^>(>*From )/, '$1')).join('\n');
        messages.push({ envelope: cur.envelope, date: cur.date, headers, body: body ? body + '\n' : '' });
    };
    lines.forEach((line, i) => {
        const m = POSTMARK.exec(line);
        if (m && (i === 0 || lines[i - 1] === '')) {
            finish();
            cur = { envelope: m[1], date: m[2], lines: [] };
        } else if (cur) {
            cur.lines.push(line);
        }
    });
    finish();
    return messages;
}

/** Serialises a message in mbox format (postmark, headers, body, blank line). */
export function formatMbox(m: MailMessage): string {
    const body = m.body.replace(/^(>*From )/gm, '>$1');
    return `From ${m.envelope}  ${m.date}\n` +
        m.headers.map(([k, v]) => `${k}: ${v}\n`).join('') + '\n' +
        body + (body === '' || body.endsWith('\n') ? '' : '\n') + '\n';
}

/** The message as shown by the print command: headers, blank line, body. */
export function formatForDisplay(m: MailMessage): string {
    return m.headers.map(([k, v]) => `${k}: ${v}\n`).join('') + '\n' + m.body;
}

/** Address part of a From/To header ("Name <a@b>" → "a@b"). */
export function addressOf(value: string): string {
    const m = /<([^>]*)>/.exec(value);
    return (m ? m[1] : value.replace(/\(.*\)/, '')).trim();
}

/**
 * The local mail transfer agent: delivers to /var/mail/<user> on this host
 * and returns undeliverable mail to the sender.
 */
export class LocalMailer {
    constructor(private spool: Spool) { }

    private domainNames(): string[] {
        const host = this.spool.hostname();
        const names = [host, 'localhost'];
        const hosts = this.spool.read('/etc/hosts') ?? '';
        for (const line of hosts.split('\n')) {
            const words = line.replace(/#.*/, '').trim().split(/\s+/);
            if (words.slice(1).includes(host)) names.push(...words.slice(1));
        }
        return names.map(n => n.toLowerCase());
    }

    /** Appends a message to a user's system mailbox, creating it if needed. */
    deliverLocal(user: string, m: MailMessage): boolean {
        const pw = this.spool.users.byName(user);
        if (!pw) return false;
        const path = `${MAIL_SPOOL}/${user}`;
        const exists = this.spool.exists(path);
        this.spool.fs.writeFile(path, formatMbox(m), 'a', pw.uid, MAIL_GID, '/');
        if (!exists) {
            this.spool.fs.chmod(path, 0o660, '/');
            this.spool.fs.chown(path, pw.uid, MAIL_GID, '/');
        }
        return true;
    }

    /**
     * Sends a composed message to each recipient. Returns the failed
     * recipients, which are also reported to the sender by a bounce.
     */
    send(m: MailMessage, recipients: string[], now: Date): string[] {
        const host = this.spool.hostname();
        const locals = this.domainNames();
        const failures: string[] = [];
        for (const rcpt of recipients) {
            const addr = addressOf(rcpt);
            const at = addr.lastIndexOf('@');
            const user = at < 0 ? addr : addr.substring(0, at);
            const domain = at < 0 ? host : addr.substring(at + 1).toLowerCase();
            if (!locals.includes(domain)) {
                failures.push(`<${addr}>: Host or domain name not found. Name service error for name=${domain} type=MX: Host not found, try again`);
            } else if (!this.deliverLocal(user, m)) {
                failures.push(`<${user}@${host}>: unknown user: "${user}"`);
            }
        }
        if (failures.length) this.bounce(m, failures, now);
        return failures;
    }

    private bounce(original: MailMessage, failures: string[], now: Date): void {
        const sender = original.envelope.split('@')[0];
        const host = this.spool.hostname();
        const notice: MailMessage = {
            envelope: 'MAILER-DAEMON',
            date: asctime(now),
            headers: [
                ['Date', rfc5322Date(now)],
                ['From', `MAILER-DAEMON@${host} (Mail Delivery System)`],
                ['Subject', 'Undelivered Mail Returned to Sender'],
                ['To', original.envelope],
            ],
            body: `This is the mail system at host ${host}.\n\n` +
                `I'm sorry to have to inform you that your message could not\n` +
                `be delivered to one or more recipients.\n\n` +
                failures.map(f => `${f}\n`).join('') + '\n' +
                '--- Original message follows ---\n\n' + formatForDisplay(original),
        };
        this.deliverLocal(sender, notice);
    }
}
