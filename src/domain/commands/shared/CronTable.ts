/**
 * CronTable - syntax checking for crontab(5) files, as the Vixie/cronie
 * crontab(1) does before installing one:
 *
 *   # comment                         blank lines
 *   NAME = value                      environment settings
 *   min hour mday month wday command  (lists, ranges, steps, names, *)
 *   @reboot|@yearly|@annually|@monthly|@weekly|@daily|@midnight|@hourly command
 *
 * Errors carry the 1-based line number and the cron(8) wording
 * ("bad minute", "bad hour", "bad day-of-month", "bad month",
 * "bad day-of-week", "bad command", "bad time specifier").
 */
export interface CronError {
    line: number;
    message: string;
}

const FIELDS: { name: string; min: number; max: number; names?: string[] }[] = [
    { name: 'minute', min: 0, max: 59 },
    { name: 'hour', min: 0, max: 23 },
    { name: 'day-of-month', min: 1, max: 31 },
    { name: 'month', min: 1, max: 12, names: ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'] },
    { name: 'day-of-week', min: 0, max: 7, names: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] },
];

const SPECIALS = new Set(['@reboot', '@yearly', '@annually', '@monthly', '@weekly', '@daily', '@midnight', '@hourly']);

function value(text: string, f: typeof FIELDS[number]): number | null {
    if (/^\d+$/.test(text)) {
        const n = parseInt(text, 10);
        return n >= f.min && n <= f.max ? n : null;
    }
    const i = f.names?.indexOf(text.toLowerCase()) ?? -1;
    return i >= 0 ? i + (f.min === 1 ? 1 : 0) : null;
}

/** Validates one time field (e.g. "1-10/2,15,jan"). */
export function validField(text: string, f: typeof FIELDS[number]): boolean {
    return text.split(',').every(part => {
        const [range, step, extra] = part.split('/');
        if (extra !== undefined) return false;
        if (step !== undefined && !/^[1-9]\d*$/.test(step)) return false;
        if (range === '*') return true;
        const bounds = range.split('-');
        if (bounds.length > 2) return false;
        const lo = value(bounds[0], f);
        if (lo === null) return false;
        if (bounds.length === 2) {
            const hi = value(bounds[1], f);
            return hi !== null && hi >= lo;
        }
        return true;
    });
}

/** Checks a crontab; returns the errors found (empty when it may be installed). */
export function checkCrontab(text: string): CronError[] {
    const errors: CronError[] = [];
    const lines = text.split('\n');
    if (text !== '' && !text.endsWith('\n')) lines.push('');
    lines.pop();
    lines.forEach((raw, idx) => {
        const line = raw.trim();
        const n = idx + 1;
        if (line === '' || line.startsWith('#')) return;
        if (/^[A-Za-z_][A-Za-z0-9_]*\s*=/.test(line) || /^(["'])[^"']*\1\s*=/.test(line)) return;
        const words = line.split(/\s+/);
        if (words[0].startsWith('@')) {
            if (!SPECIALS.has(words[0].toLowerCase())) { errors.push({ line: n, message: 'bad time specifier' }); return; }
            if (words.length < 2) errors.push({ line: n, message: 'bad command' });
            return;
        }
        for (let i = 0; i < FIELDS.length; i++) {
            if (words[i] === undefined || !validField(words[i], FIELDS[i])) {
                errors.push({ line: n, message: `bad ${FIELDS[i].name}` });
                return;
            }
        }
        if (words.length <= FIELDS.length) errors.push({ line: n, message: 'bad command' });
    });
    return errors;
}
