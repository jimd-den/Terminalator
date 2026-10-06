import { Spool, asctime } from './Spool';

/**
 * PrintSpool - the print service's queues. Destinations are read from
 * /etc/printcap (name|alias|description:lp=device:...; the first entry is
 * the system default). Requests are spooled CUPS-style in /var/spool/cups:
 * a control file cNNNNN (attributes, one "key value" per line) and data
 * files dNNNNN-001... Request IDs are "<destination>-<number>".
 * The simulated printers never finish a job, so requests stay queued until
 * cancelled.
 */
export interface Printer {
    name: string;
    aliases: string[];
    description: string;
    device: string;
}

export interface PrintJob {
    id: number;
    dest: string;
    user: string;
    uid: number;
    title: string;
    copies: number;
    priority: number;
    size: number;
    time: Date;
    files: number;
}

export const PRINT_SPOOL = '/var/spool/cups';

export class PrintSpool {
    constructor(private spool: Spool) { }

    printers(): Printer[] {
        const text = this.spool.read('/etc/printcap') ?? '';
        const out: Printer[] = [];
        for (const raw of text.replace(/\\\n\s*/g, '').split('\n')) {
            const line = raw.trim();
            if (!line || line.startsWith('#')) continue;
            const [namesPart, ...caps] = line.split(':');
            const names = namesPart.split('|');
            const device = caps.find(c => c.startsWith('lp='))?.substring(3) ?? '/dev/null';
            out.push({ name: names[0], aliases: names.slice(1, -1), description: names.length > 1 ? names[names.length - 1] : names[0], device });
        }
        return out;
    }

    printer(name: string): Printer | undefined {
        return this.printers().find(p => p.name === name);
    }

    /** The default destination: $LPDEST, $PRINTER, else the first printcap entry. */
    defaultDest(env: Record<string, string>): string | undefined {
        return env.LPDEST || env.PRINTER || this.printers()[0]?.name;
    }

    jobs(): PrintJob[] {
        const out: PrintJob[] = [];
        for (const name of this.spool.list(PRINT_SPOOL)) {
            const m = /^c(\d{5})$/.exec(name);
            if (!m) continue;
            const attrs = new Map<string, string>();
            for (const line of (this.spool.read(`${PRINT_SPOOL}/${name}`) ?? '').split('\n')) {
                const i = line.indexOf(' ');
                if (i > 0) attrs.set(line.substring(0, i), line.substring(i + 1));
            }
            out.push({
                id: parseInt(m[1], 10), dest: attrs.get('job-printer') ?? '', user: attrs.get('job-originating-user-name') ?? '',
                uid: parseInt(attrs.get('job-uid') ?? '0', 10), title: attrs.get('job-name') ?? '',
                copies: parseInt(attrs.get('copies') ?? '1', 10), priority: parseInt(attrs.get('job-priority') ?? '50', 10),
                size: parseInt(attrs.get('job-octets') ?? '0', 10), time: new Date(parseInt(attrs.get('time-at-creation') ?? '0', 10) * 1000),
                files: parseInt(attrs.get('number-of-documents') ?? '1', 10),
            });
        }
        return out.sort((a, b) => a.id - b.id);
    }

    /** Queues a request and returns its number. */
    submit(dest: string, title: string, copies: number, priority: number, documents: string[], now: Date): number {
        const id = this.spool.nextSequence(`${PRINT_SPOOL}/.seq`);
        const num = String(id).padStart(5, '0');
        const { uid } = this.spool.context.user;
        const size = documents.reduce((n, d) => n + d.length, 0);
        documents.forEach((d, i) => this.spool.write(`${PRINT_SPOOL}/d${num}-${String(i + 1).padStart(3, '0')}`, d, 0o640, 0, 0));
        const attrs: [string, string | number][] = [
            ['job-id', id], ['job-printer', dest], ['job-originating-user-name', this.spool.userName], ['job-uid', uid],
            ['job-name', title], ['copies', copies], ['job-priority', priority], ['job-octets', size],
            ['time-at-creation', Math.floor(now.getTime() / 1000)], ['number-of-documents', documents.length],
        ];
        this.spool.write(`${PRINT_SPOOL}/c${num}`, attrs.map(([k, v]) => `${k} ${v}\n`).join(''), 0o600, 0, 0);
        return id;
    }

    remove(job: PrintJob): void {
        const num = String(job.id).padStart(5, '0');
        for (const name of this.spool.list(PRINT_SPOOL)) {
            if (name === `c${num}` || name.startsWith(`d${num}-`)) this.spool.remove(`${PRINT_SPOOL}/${name}`);
        }
    }

    /** lpstat's job line: "lp-1                    operator          1024   Sun Oct  4 19:30:00 2026". */
    static jobLine(job: PrintJob): string {
        return `${`${job.dest}-${job.id}`.padEnd(23)} ${job.user.padEnd(13)} ${String(job.size).padStart(8)}   ${asctime(job.time)}`;
    }
}
