/**
 * what - identify SCCS files (POSIX): `what [-s] file...`
 *
 * Searches each file (text or binary) for the pattern "@(#)" - what get
 * substitutes for %Z% - and writes the file name followed by each string
 * after the pattern, up to a '"', '>', newline, '\' or NUL, indented by a
 * tab. -s stops after the first occurrence in each file. Standard input is
 * searched when no file is given. Exit status 0 when anything matched,
 * 1 otherwise.
 */
import { CommandResponse } from '../ICommand';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { Utility } from '../shared/Utility';
import { getopt, readInputBytes } from '../shared/InputFiles';

const MARK = [0x40, 0x28, 0x23, 0x29]; // "@(#)"
const STOP = new Set([0x22, 0x3e, 0x0a, 0x5c, 0x00]); // " > \n \ NUL

/** Every identification string in `data`. */
export function whatStrings(data: Uint8Array, firstOnly = false): string[] {
    const found: string[] = [];
    const decoder = new TextDecoder('utf-8');
    for (let i = 0; i + 3 < data.length; i++) {
        if (data[i] !== MARK[0] || data[i + 1] !== MARK[1] || data[i + 2] !== MARK[2] || data[i + 3] !== MARK[3]) continue;
        let end = i + 4;
        while (end < data.length && !STOP.has(data[end])) end++;
        found.push(decoder.decode(data.subarray(i + 4, end)));
        if (firstOnly) break;
        i = end - 1;
    }
    return found;
}

export class WhatCommand extends Utility {
    readonly utility = 'what';

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const { opts, operands, error } = getopt(args, 's');
        if (error) return this.usage(state, error, 2);
        const errors: string[] = [];
        let out = '';
        let matched = false;
        for (const name of operands.length ? operands : ['-']) {
            const input = readInputBytes(context, name);
            if (!input.ok) { errors.push(input.error); continue; }
            const strings = whatStrings(input.data, opts.has('s'));
            if (name !== '-') out += `${name}:\n`;
            for (const s of strings) out += `\t${s}\n`;
            matched ||= strings.length > 0;
        }
        return this.respond(state, out, errors, matched && !errors.length ? 0 : 1);
    }
}
