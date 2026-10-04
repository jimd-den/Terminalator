/**
 * AtTimeSpec - the at(1) time grammar (POSIX "at" timespec, plus the
 * common extensions of the Linux at/atd implementation).
 *
 *   timespec  := 'now' [increment] | time [date] [increment] | date [time] [increment]
 *   time      := HH:MM | HHMM | H | HH  [am|pm] [utc|zulu]  | noon | midnight | teatime
 *   date      := today | tomorrow | <weekday> | <month> DD [[,] YYYY] | DD <month> [YYYY]
 *              | MM/DD/YY[YY] | DD.MM.YY[YY] | YYYY-MM-DD
 *   increment := + N unit | next unit      unit := minute|hour|day|week|month|year[s]
 *
 * A time of day already past today (with no date) means tomorrow; a month/day
 * already past this year means next year.
 */

export type TimeSpecResult = { ok: true; time: Date } | { ok: false; token: string };

const MONTH_NAMES = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const DAY_NAMES = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const UNITS: Record<string, 'min' | 'hour' | 'day' | 'week' | 'month' | 'year'> = {
    min: 'min', mins: 'min', minute: 'min', minutes: 'min',
    hour: 'hour', hours: 'hour', day: 'day', days: 'day', week: 'week', weeks: 'week',
    month: 'month', months: 'month', year: 'year', years: 'year',
};

function monthIndex(word: string): number {
    if (word.length < 3) return -1;
    const full = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
    const i = MONTH_NAMES.indexOf(word.substring(0, 3));
    return i >= 0 && full[i].startsWith(word) ? i : -1;
}

function dayIndex(word: string): number {
    if (word.length < 3) return -1;
    const full = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const i = DAY_NAMES.indexOf(word.substring(0, 3));
    return i >= 0 && full[i].startsWith(word) ? i : -1;
}

function tokenize(text: string): string[] {
    return text.toLowerCase().match(/\d+(?:[:./-]\d+)+|\d+|[a-z]+|\S/g) ?? [];
}

/** Parses an at(1) timespec relative to `now`. */
export function parseAtTime(words: string[], now: Date): TimeSpecResult {
    const toks = tokenize(words.join(' '));
    let i = 0;
    const peek = () => toks[i];
    const fail = (): TimeSpecResult => ({ ok: false, token: toks[Math.min(i, toks.length - 1)] ?? '' });
    if (toks.length === 0) return { ok: false, token: '' };

    const base = new Date(now.getTime());
    base.setSeconds(0, 0);
    let hour: number | null = null;
    let minute = 0;
    let utc = false;
    let date: { y?: number; m: number; d: number } | null = null;
    let relDays = 0;
    let weekday: number | null = null;

    const parseTime = (): boolean => {
        const t = peek();
        if (t === 'noon') { hour = 12; i++; return true; }
        if (t === 'midnight') { hour = 0; i++; return true; }
        if (t === 'teatime') { hour = 16; i++; return true; }
        let m = /^(\d{1,2}):(\d{2})$/.exec(t ?? '');
        let h: number, mi = 0;
        if (m) { h = +m[1]; mi = +m[2]; }
        else if ((m = /^(\d{3,4})$/.exec(t ?? ''))) { h = Math.floor(+m[1] / 100); mi = +m[1] % 100; }
        else if ((m = /^(\d{1,2})$/.exec(t ?? '')) && !(toks[i + 1] && monthIndex(toks[i + 1]) >= 0)) { h = +m[1]; }
        else return false;
        i++;
        const suffix = peek();
        if (suffix === 'am' || suffix === 'pm') {
            if (h < 1 || h > 12) { i--; return false; }
            h = (h % 12) + (suffix === 'pm' ? 12 : 0);
            i++;
        }
        if (h > 23 || mi > 59) { i--; return false; }
        if (peek() === 'utc' || peek() === 'zulu') { utc = true; i++; }
        hour = h; minute = mi;
        return true;
    };

    const year = (y: number) => (y < 100 ? 2000 + y : y);
    const parseDate = (): boolean => {
        const t = peek();
        if (t === undefined) return false;
        if (t === 'today') { relDays = 0; date = null; i++; return true; }
        if (t === 'tomorrow') { relDays = 1; i++; return true; }
        if (dayIndex(t) >= 0) { weekday = dayIndex(t); i++; return true; }
        const mon = monthIndex(t);
        if (mon >= 0 && /^\d{1,2}$/.test(toks[i + 1] ?? '')) {
            const d = +toks[i + 1];
            i += 2;
            let y: number | undefined;
            if (peek() === ',') i++;
            if (/^\d{2}$|^\d{4}$/.test(peek() ?? '')) y = year(+toks[i++]);
            date = { y, m: mon, d };
            return true;
        }
        if (/^\d{1,2}$/.test(t) && monthIndex(toks[i + 1] ?? '') >= 0) {
            const d = +t;
            const m = monthIndex(toks[i + 1]);
            i += 2;
            let y: number | undefined;
            if (/^\d{2}$|^\d{4}$/.test(peek() ?? '')) y = year(+toks[i++]);
            date = { y, m, d };
            return true;
        }
        let m: RegExpExecArray | null;
        if ((m = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(t))) { date = { m: +m[1] - 1, d: +m[2], y: year(+m[3]) }; i++; return true; }
        if ((m = /^(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})$/.exec(t))) { date = { d: +m[1], m: +m[2] - 1, y: year(+m[3]) }; i++; return true; }
        if ((m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t))) { date = { y: +m[1], m: +m[2] - 1, d: +m[3] }; i++; return true; }
        return false;
    };

    let isNow = false;
    if (peek() === 'now') { isNow = true; i++; }
    else if (parseTime()) { parseDate(); }
    else if (parseDate()) { parseTime(); }
    else return fail();

    // Validate an explicit calendar date.
    const d0 = date as { y?: number; m: number; d: number } | null;
    if (d0 && (d0.m < 0 || d0.m > 11 || d0.d < 1 || d0.d > new Date(d0.y ?? base.getFullYear(), d0.m + 1, 0).getDate())) {
        i--; return fail();
    }

    // Increments.
    const incs: { n: number; unit: string }[] = [];
    while (i < toks.length) {
        if (peek() === '+') {
            i++;
            if (!/^\d+$/.test(peek() ?? '')) return fail();
            const n = +toks[i++];
            const unit = UNITS[peek() ?? ''];
            if (!unit) return fail();
            i++;
            incs.push({ n, unit });
        } else if (peek() === 'next') {
            i++;
            const unit = UNITS[peek() ?? ''];
            if (!unit) return fail();
            i++;
            incs.push({ n: 1, unit });
        } else {
            return fail();
        }
    }

    const t = new Date(base.getTime());
    if (!isNow) {
        if (d0) {
            t.setFullYear(d0.y ?? t.getFullYear(), d0.m, d0.d);
        } else if (weekday !== null) {
            t.setDate(t.getDate() + ((weekday - t.getDay() + 7) % 7));
        } else {
            t.setDate(t.getDate() + relDays);
        }
        if (hour !== null) {
            if (utc) t.setUTCHours(hour, minute, 0, 0);
            else t.setHours(hour, minute, 0, 0);
        }
        if (t.getTime() < base.getTime()) {
            if (!d0 && weekday === null && relDays === 0) t.setDate(t.getDate() + 1);
            else if (d0 && d0.y === undefined) t.setFullYear(t.getFullYear() + 1);
            else if (weekday !== null) t.setDate(t.getDate() + 7);
        }
    }
    for (const { n, unit } of incs) {
        switch (unit) {
            case 'min': t.setMinutes(t.getMinutes() + n); break;
            case 'hour': t.setHours(t.getHours() + n); break;
            case 'day': t.setDate(t.getDate() + n); break;
            case 'week': t.setDate(t.getDate() + 7 * n); break;
            case 'month': t.setMonth(t.getMonth() + n); break;
            case 'year': t.setFullYear(t.getFullYear() + n); break;
        }
    }
    return { ok: true, time: t };
}

/** Parses the -t argument, [[CC]YY]MMDDhhmm[.SS] (as touch -t). */
export function parsePosixTime(spec: string, now: Date): Date | null {
    const m = /^(\d{8}|\d{10}|\d{12})(?:\.(\d{2}))?$/.exec(spec);
    if (!m) return null;
    const digits = m[1];
    let year = now.getFullYear();
    let rest = digits;
    if (digits.length === 12) { year = +digits.substring(0, 4); rest = digits.substring(4); }
    else if (digits.length === 10) { const yy = +digits.substring(0, 2); year = yy < 69 ? 2000 + yy : 1900 + yy; rest = digits.substring(2); }
    const [mo, d, h, mi] = [0, 2, 4, 6].map(k => +rest.substring(k, k + 2));
    const s = m[2] ? +m[2] : 0;
    if (mo < 1 || mo > 12 || d < 1 || d > new Date(year, mo, 0).getDate() || h > 23 || mi > 59 || s > 60) return null;
    return new Date(year, mo - 1, d, h, mi, s, 0);
}
