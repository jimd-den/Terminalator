import { ProcessContext } from '../../entities/ProcessContext';
import { statPath } from './FileInfo';

/** Errno-style messages from file system exceptions. */
export function strerror(e: any): string {
    const msg = String(e?.message ?? e);
    if (/permission/i.test(msg)) return 'Permission denied';
    if (/not permitted/i.test(msg)) return 'Operation not permitted';
    if (/file exists/i.test(msg)) return 'File exists';
    if (/not empty/i.test(msg)) return 'Directory not empty';
    if (/is a directory/i.test(msg)) return 'Is a directory';
    if (/not a directory/i.test(msg)) return 'Not a directory';
    if (/too many levels/i.test(msg)) return 'Too many levels of symbolic links';
    if (/no such|not found|parent/i.test(msg)) return 'No such file or directory';
    return msg;
}

/**
 * Canonical absolute path with every symlink resolved (realpath/readlink -f).
 *   'e': every component must exist
 *   'f': every component but the last must exist
 *   'm': nothing needs to exist
 * Returns null when a required component is missing.
 */
export function canonicalize(context: ProcessContext, path: string, mode: 'e' | 'f' | 'm', followLinks = true): string | null {
    const fs = context.fileSystemService;
    const pending = path.split('/').filter(Boolean);
    const resolved: string[] = [];
    if (!path.startsWith('/')) resolved.push(...context.cwd.split('/').filter(Boolean));
    let hops = 0;

    while (pending.length) {
        const part = pending.shift()!;
        if (part === '.') continue;
        if (part === '..') { resolved.pop(); continue; }
        const candidate = '/' + [...resolved, part].join('/');
        const info = statPath(context, candidate, false);
        if (!info) {
            const isLast = pending.length === 0;
            if (mode === 'e' || (mode === 'f' && !isLast)) return null;
            resolved.push(part);
            continue;
        }
        if (info.kind === 'symlink' && followLinks) {
            if (++hops > 40) return null;
            const target = fs.readlink(candidate, '/');
            if (target.startsWith('/')) resolved.length = 0;
            pending.unshift(...target.split('/').filter(Boolean));
            continue;
        }
        if (pending.length && info.kind !== 'directory' && !(info.kind === 'symlink' && !followLinks)) return null;
        resolved.push(part);
    }
    return '/' + resolved.join('/');
}
