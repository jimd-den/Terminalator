/**
 * CalCommand - Core Command
 *
 * Print a calendar.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 *
 * Intent:
 * Date visualization.
 */

import { ICommand } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystem } from '../../entities/FileSystem';

export class CalCommand implements ICommand {
    constructor(private fs: FileSystem) { }

    execute(args: string[], state: TerminalState, input?: string): CommandResponse {
        const now = new Date();
        let month = now.getMonth(); // 0-11
        let year = now.getFullYear();

        // args: [year] or [month year]?
        // `cal 2024` -> print whole year (omitted for now)
        // `cal 12 2024` -> print Dec 2024

        if (args.length === 1) {
            year = parseInt(args[0]);
            // printing whole year is complex, let's assume it's just year or fail if logic simple.
            // standard `cal 2024` prints 12 months.
            // standard `cal` prints current month.
            // Let's simplified: if 1 arg, assume it's year and print nothing or fail?
            // Or assume 1 arg is year and print current month of that year? No.
            // Let's just handle no args (current month) nicely.
        } else if (args.length === 2) {
            month = parseInt(args[0]) - 1;
            year = parseInt(args[1]);
        }

        const calStr = this.generateMonthCal(year, month);

        return {
            output: calStr,
            newState: state,
            exitCode: 0
        };
    }

    private generateMonthCal(year: number, month: number): string {
        const monthNames = ["January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];

        // Header
        // "   October 2023   "
        const header = `${monthNames[month]} ${year}`;
        // Center header in 20 chars
        const padding = Math.floor((20 - header.length) / 2);
        const centeredHeader = ' '.repeat(padding) + header; // POSIX `cal` doesn't strictly pad right?

        const daysHeader = "Su Mo Tu We Th Fr Sa";

        // Logic
        const firstDay = new Date(year, month, 1);
        const startDay = firstDay.getDay(); // 0 (Sun) - 6 (Sat)
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        let output = centeredHeader + '\n' + daysHeader + '\n';

        let currentDay = 1;
        let line = '   '.repeat(startDay); // 3 chars per day space

        for (let i = startDay; i < 7; i++) {
            if (currentDay > daysInMonth) break;
            line += currentDay.toString().padStart(2, ' ') + ' ';
            currentDay++;
        }
        output += line.trimEnd() + '\n';

        while (currentDay <= daysInMonth) {
            line = '';
            for (let i = 0; i < 7; i++) {
                if (currentDay > daysInMonth) {
                    // line += '   '; // padding? cal usually stops
                    break;
                }
                line += currentDay.toString().padStart(2, ' ') + ' ';
                currentDay++;
            }
            output += line.trimEnd() + '\n';
        }

        return output.trimEnd(); // cal usually adds one newline at end
    }
}
