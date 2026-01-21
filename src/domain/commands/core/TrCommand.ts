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
import { FileSystemService } from '../../services/FileSystemService';

interface TrOptions {
    delete: boolean;
    squeeze: boolean;
    complement: boolean;
    set1: string;
    set2: string;
}

export class TrCommand implements ICommand {
    constructor(private fs: FileSystemService) { }

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

        if (input === undefined) {
            return { output: '', newState: state, exitCode: 0 };
        }

        let output = input;

        if (options.delete) {
            if (options.squeeze && sets.length > 1) {
                output = this.deleteChars(output, options.set1, options.complement);
                output = this.squeezeChars(output, options.set2);
            } else {
                if (sets.length < 1) return { output: 'tr: missing operand', newState: state, exitCode: 1 };
                output = this.deleteChars(output, options.set1, options.complement);
            }
        } else if (options.squeeze && sets.length === 1) {
            output = this.squeezeChars(output, options.set1);
        } else {
            if (sets.length < 2) {
                return { output: 'tr: missing operand', newState: state, exitCode: 1 };
            }
            output = this.translate(output, options.set1, options.set2, options.complement);

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
        let expanded = '';
        let i = 0;

        if (setStr === 'a-z') return 'abcdefghijklmnopqrstuvwxyz';
        if (setStr === 'A-Z') return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        if (setStr === '0-9') return '0123456789';

        while (i < setStr.length) {
            if (i + 2 < setStr.length && setStr[i + 1] === '-') {
                const start = setStr.charCodeAt(i);
                const end = setStr.charCodeAt(i + 2);
                if (start < end) {
                    for (let c = start; c <= end; c++) {
                        expanded += String.fromCharCode(c);
                    }
                    i += 3;
                    continue;
                }
            }

            if (setStr[i] === '\\') {
                if (i + 1 < setStr.length) {
                    const next = setStr[i + 1];
                    if (next === 'n') expanded += '\n';
                    else if (next === 't') expanded += '\t';
                    else if (next === '\\') expanded += '\\';
                    else expanded += next;
                    i += 2;
                    continue;
                }
            }

            expanded += setStr[i];
            i++;
        }
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

    private translate(str: string, set1: string, set2: string, complement: boolean): string {
        const map = new Map<string, string>();

        if (!complement) {
            for (let i = 0; i < set1.length; i++) {
                const char1 = set1[i];
                let char2 = '';
                if (i < set2.length) {
                    char2 = set2[i];
                } else {
                    char2 = set2[set2.length - 1];
                }
                map.set(char1, char2);
            }
        }

        let res = '';
        const set1Set = new Set(set1.split(''));
        const lastSet2 = set2.length > 0 ? set2[set2.length - 1] : '';

        for (const char of str) {
            if (complement) {
                if (!set1Set.has(char)) {
                    res += lastSet2;
                } else {
                    res += char;
                }
            } else {
                res += map.get(char) ?? char;
            }
        }
        return res;
    }
}
