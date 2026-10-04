import { ProcessContext, getStdinAsString } from '../../entities/ProcessContext';
import { streamToBytes } from '../../services/shell/io/OutputSink';
import { isBinaryStream } from '../../services/shell/io/IOContext';
import { statPath, canAccess } from './FileInfo';

export type InputResult = { ok: true; name: string; data: string } | { ok: false; name: string; error: string };

/**
 * Reads a utility's input operand: '-' (or no operand) is standard input,
 * anything else a file. Errors use the conventional strerror wording.
 */
export function readInput(context: ProcessContext, operand?: string): InputResult {
    if (operand === undefined || operand === '-') {
        return { ok: true, name: operand ?? '-', data: getStdinAsString(context) ?? '' };
    }
    const info = statPath(context, operand);
    if (!info) return { ok: false, name: operand, error: `${operand}: No such file or directory` };
    if (info.kind === 'directory') return { ok: false, name: operand, error: `${operand}: Is a directory` };
    if (!canAccess(context, info, 4)) return { ok: false, name: operand, error: `${operand}: Permission denied` };
    try {
        return { ok: true, name: operand, data: context.fileSystemService.readFile(info.path, '/', context.user) };
    } catch (e: any) {
        return { ok: false, name: operand, error: `${operand}: ${e?.message ?? 'read error'}` };
    }
}

/** Splits text into lines, keeping each line's terminator. */
export function splitLinesKeep(data: string): string[] {
    const lines = data.match(/[^\n]*\n|[^\n]+$/g);
    return lines ?? [];
}

/**
 * Normalises historical number options: `-5` → `-n 5`, `+5` → `-n +5`
 * for utilities like head/tail that still accept them.
 */
export function normalizeObsoleteCount(args: string[]): string[] {
    if (args.length > 0 && /^[-+][0-9]+[lcb]?$/.test(args[0])) {
        const m = /^([-+])([0-9]+)([lcb]?)$/.exec(args[0])!;
        const flag = m[3] === 'c' ? '-c' : '-n';
        return [flag, (m[1] === '+' ? '+' : '') + m[2], ...args.slice(1)];
    }
    return args;
}

/** Minimal getopt: parses `spec` like "n:c:qv" from args; returns options and operands. */
export function getopt(args: string[], spec: string): { opts: Map<string, string | true>; operands: string[]; error?: string } {
    const opts = new Map<string, string | true>();
    let i = 0;
    for (; i < args.length; i++) {
        const a = args[i];
        if (a === '--') { i++; break; }
        if (!a.startsWith('-') || a === '-') break;
        for (let j = 1; j < a.length; j++) {
            const c = a[j];
            const idx = spec.indexOf(c);
            if (idx === -1 || c === ':') return { opts, operands: [], error: `invalid option -- '${c}'` };
            if (spec[idx + 1] === ':') {
                const value = j + 1 < a.length ? a.substring(j + 1) : args[++i];
                if (value === undefined) return { opts, operands: [], error: `option requires an argument -- '${c}'` };
                opts.set(c, value);
                break;
            }
            opts.set(c, true);
        }
    }
    return { opts, operands: args.slice(i) };
}

export type BytesResult = { ok: true; name: string; data: Uint8Array } | { ok: false; name: string; error: string };

/** Like readInput, but binary-safe: file bytes as stored, stdin as a byte string. */
export function readInputBytes(context: ProcessContext, operand?: string): BytesResult {
    if (operand === undefined || operand === '-') {
        return { ok: true, name: operand ?? '-', data: streamToBytes(getStdinAsString(context) ?? '', isBinaryStream(context.stdin)) };
    }
    const info = statPath(context, operand);
    if (!info) return { ok: false, name: operand, error: `${operand}: No such file or directory` };
    if (info.kind === 'directory') return { ok: false, name: operand, error: `${operand}: Is a directory` };
    if (!canAccess(context, info, 4)) return { ok: false, name: operand, error: `${operand}: Permission denied` };
    return { ok: true, name: operand, data: context.fileSystemService.readFileBuffer(info.path, '/', context.user) };
}
