/**
 * TrCommand - Core Command
 *
 * Translate, squeeze, and/or delete characters.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 *
 * Intent:
 * Allows character-level transformations on standard input.
 */

import { ICommand } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystem } from '../../entities/FileSystem';

interface TrOptions {
    delete: boolean;
    squeeze: boolean;
    complement: boolean;
    set1: string;
    set2: string;
}

export class TrCommand implements ICommand {
    constructor(private fs: FileSystem) { }

    execute(args: string[], state: TerminalState, input?: string): CommandResponse {
        const options: TrOptions = {
            delete: false,
            squeeze: false,
            complement: false,
            set1: '',
            set2: ''
        };

        const sets: string[] = [];

        // Argument Parsing
        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            if (arg === '-d') options.delete = true;
            else if (arg === '-s') options.squeeze = true;
            else if (arg === '-c' || arg === '-C') options.complement = true;
            else if (!arg.startsWith('-')) {
                // Handling args usually passed as strings.
                // In shell, they are args.
                sets.push(arg);
            }
        }

        if (sets.length === 0) {
             return { output: 'tr: missing operand', newState: state, exitCode: 1 };
        }

        options.set1 = this.expandSet(sets[0]);
        if (sets.length > 1) {
            options.set2 = this.expandSet(sets[1]);
        }

        if (!input) {
             // Should wait for stdin in real shell
             return { output: '', newState: state, exitCode: 0 };
        }

        let output = input;

        if (options.delete) {
            if (options.squeeze && options.set2) {
                 // tr -d -s SET1 SET2 ?
                 // No, standard is tr -d SET1 or tr -s SET1 or tr -ds SET1 SET2 (delete SET1, squeeze SET2)
                 // Wait, tr -d SET1 deletes chars in SET1.
                 // tr -s SET1 squeezes repeats of chars in SET1.
                 // If both, order matters?
                 // Usually: delete first, then squeeze?
                 // "tr -ds SET1 SET2" -> deletes SET1, squeezes SET2.
            }

            // Simple delete logic
            // If squeeze is also present with 2 sets, it means delete SET1, squeeze SET2.
            if (options.squeeze && sets.length > 1) {
                 output = this.deleteChars(output, options.set1, options.complement);
                 output = this.squeezeChars(output, options.set2);
            } else {
                 output = this.deleteChars(output, options.set1, options.complement);
            }

        } else if (options.squeeze && sets.length === 1) {
            // tr -s SET1 (squeeze repeats of SET1)
            output = this.squeezeChars(output, options.set1);
        } else {
            // Translate SET1 to SET2
            // If squeeze is also set: tr -s SET1 SET2 -> translate SET1 to SET2 then squeeze SET2
            if (!options.set2) {
                 return { output: 'tr: missing set2', newState: state, exitCode: 1 };
            }

            output = this.translate(output, options.set1, options.set2);
            if (options.squeeze) {
                output = this.squeezeChars(output, options.set2);
            }
        }

        return {
            output: output,
            newState: state,
            exitCode: 0
        };
    }

    private expandSet(setStr: string): string {
        // Handle escapes like \n, \t
        let expanded = setStr
            .replace(/\\n/g, '\n')
            .replace(/\\t/g, '\t')
            .replace(/\\\\/g, '\\'); // simplistic unescape

        // TODO: Handle ranges [a-z] if needed. For now, strict literal.
        return expanded;
    }

    private deleteChars(str: string, set: string, complement: boolean): string {
        const setSet = new Set(set.split(''));
        let res = '';
        for (const char of str) {
            const has = setSet.has(char);
            if (complement ? has : !has) {
                res += char;
            }
        }
        return res;
    }

    private squeezeChars(str: string, set: string): string {
        const setSet = new Set(set.split(''));
        let res = '';
        let lastChar = '';
        for (const char of str) {
            if (setSet.has(char) && char === lastChar) {
                continue;
            }
            res += char;
            lastChar = char;
        }
        return res;
    }

    private translate(str: string, set1: string, set2: string): string {
        const map = new Map<string, string>();
        const len = Math.max(set1.length, set2.length); // usually set1 length matters
        // POSIX: if set2 is shorter than set1, the last char of set2 is repeated.

        for (let i = 0; i < set1.length; i++) {
            const char1 = set1[i];
            let char2 = '';
            if (i < set2.length) {
                char2 = set2[i];
            } else {
                char2 = set2[set2.length - 1]; // Repeat last
            }
            map.set(char1, char2);
        }

        let res = '';
        for (const char of str) {
            res += map.get(char) ?? char;
        }
        return res;
    }
}
