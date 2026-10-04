/**
 * cal - print a calendar (POSIX): `cal [[month] year]`.
 * Years 1..9999; the Julian calendar is used up to September 1752, when
 * the British Empire adopted the Gregorian calendar (3..13 September 1752
 * never happened), as POSIX specifies.
 */
import { CommandResponse } from '../ICommand';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { FileSystemService } from '../../services/FileSystemService';
import { Utility } from '../shared/Utility';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const isLeap = (y: number) => (y <= 1752 ? y % 4 === 0 : (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0);

function daysIn(year: number, month: number): number {
    return [31, isLeap(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month];
}

/** Day of week (0 = Sunday) using the Julian calendar before 14 Sep 1752. */
function weekday(year: number, month: number, day: number): number {
    const a = Math.floor((14 - (month + 1)) / 12);
    const y = year + 4800 - a;
    const m = month + 1 + 12 * a - 3;
    const gregorian = year > 1752 || (year === 1752 && (month > 8 || (month === 8 && day >= 14)));
    const jdn = gregorian
        ? day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045
        : day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - 32083;
    return (jdn + 1) % 7;
}

export interface CalLayout { monday?: boolean; julian?: boolean }

function dayOfYear(year: number, month: number, day: number): number {
    let n = day;
    for (let m = 0; m < month; m++) n += daysIn(year, m) - (year === 1752 && m === 8 ? 11 : 0);
    return n;
}

/** The month as 8 lines (title, weekdays, 6 weeks) of 20 columns (27 with -j). */
export function monthLines(year: number, month: number, withYear: boolean, layout: CalLayout = {}): string[] {
    const cw = layout.julian ? 3 : 2;
    const width = cw * 7 + 6;
    const title = withYear ? `${MONTHS[month]} ${year}` : MONTHS[month];
    const left = Math.floor((width - title.length) / 2);
    const names = layout.monday ? ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    const lines = [(' '.repeat(left) + title).padEnd(width), names.map(n => n.padStart(cw)).join(' ')];
    const days: number[] = [];
    for (let d = 1; d <= daysIn(year, month); d++) {
        if (year === 1752 && month === 8 && d > 2 && d < 14) continue;
        days.push(d);
    }
    const blank = ' '.repeat(cw);
    const lead = (weekday(year, month, 1) + (layout.monday ? 6 : 0)) % 7;
    const cells: string[] = Array(lead).fill(blank);
    for (const d of days) cells.push(String(layout.julian ? dayOfYear(year, month, d) : d).padStart(cw));
    while (cells.length < 42) cells.push(blank);
    for (let w = 0; w < 6; w++) lines.push(cells.slice(w * 7, w * 7 + 7).join(' '));
    return lines;
}

export class CalCommand extends Utility {
    readonly utility = 'cal';

    constructor(private fs?: FileSystemService) { super(); }

    execute(args: string[], _context: ProcessContext, state: TerminalState): CommandResponse {
        const layout: CalLayout = {};
        let three = false, wholeYear = false;
        const operands: string[] = [];
        for (const a of args) {
            if (a === '--') continue;
            if (/^-[3jmsy]+$/.test(a)) {
                for (const c of a.substring(1)) {
                    if (c === '3') three = true;
                    if (c === 'j') layout.julian = true;
                    if (c === 'm') layout.monday = true;
                    if (c === 'y') wholeYear = true;
                }
                continue;
            }
            if (a.startsWith('-')) return this.usage(state, `invalid option -- '${a.substring(1)}'`);
            operands.push(a);
        }
        if (wholeYear && operands.length === 0) operands.push(String(new Date().getFullYear()));
        if (operands.length > 2) return this.usage(state, 'usage: cal [[month] year]');
        const num = (s: string) => (/^[0-9]+$/.test(s) ? parseInt(s, 10) : NaN);
        const now = new Date();

        if (operands.length === 1) {
            const year = num(operands[0]);
            if (!(year >= 1 && year <= 9999)) return this.usage(state, `year '${operands[0]}' not in range 1..9999`);
            const title = String(year);
            let out = ' '.repeat(Math.floor((64 - title.length) / 2)) + title + '\n\n';
            for (let row = 0; row < 4; row++) {
                const blocks = [0, 1, 2].map(c => monthLines(year, row * 3 + c, false, layout));
                for (let l = 0; l < 8; l++) out += blocks.map(b => b[l]).join('  ').replace(/\s+$/, '') + '\n';
            }
            return this.respond(state, out);
        }

        let month = now.getMonth();
        let year = now.getFullYear();
        if (operands.length === 2) {
            month = num(operands[0]) - 1;
            year = num(operands[1]);
            if (!(month >= 0 && month <= 11)) return this.usage(state, `month '${operands[0]}' not in range 1..12`);
            if (!(year >= 1 && year <= 9999)) return this.usage(state, `year '${operands[1]}' not in range 1..9999`);
        }
        if (three) {
            const around = [-1, 0, 1].map(d => {
                const m = (month + d + 12) % 12;
                const y = year + (month + d < 0 ? -1 : month + d > 11 ? 1 : 0);
                return monthLines(y, m, true, layout);
            });
            const lines = around[0].map((_, l) => around.map(b => b[l]).join('  ').replace(/\s+$/, ''));
            return this.respond(state, lines.join('\n') + '\n');
        }
        return this.respond(state, monthLines(year, month, true, layout).map(l => l.replace(/\s+$/, '')).join('\n') + '\n');
    }
}
