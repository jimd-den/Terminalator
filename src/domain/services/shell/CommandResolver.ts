import { FileSystemService } from '../FileSystemService';
import { TerminalState } from '../../entities/TerminalState';

/**
 * Utilities the shell runs without a PATH search, as dash and bash do
 * (they are builtins there): found even if PATH is empty or /usr/bin is
 * damaged, and reported by `type` as shell builtins.
 */
export const BUILTIN_UTILITIES = new Set(['echo', 'printf', 'test', '[', 'kill', 'true', 'false', 'pwd', 'jobs', 'fg', 'bg', 'wait', 'times', 'ulimit']);

/** Marker written into /bin stubs: the file is backed by a registry utility. */
export const UTILITY_STUB_PREFIX = '#!/bin/sh\n# terminalator-utility: ';

export type ResolvedCommand =
    | { kind: 'file'; path: string; utility?: string }
    | { kind: 'not-found' }
    | { kind: 'not-executable'; path: string }
    | { kind: 'is-directory'; path: string };

const X_OK = 1;

/**
 * CommandResolver - command search and execution lookup (XCU §2.9.1.1).
 *
 * Names containing '/' are used as paths; otherwise each PATH directory is
 * searched for an executable regular file. Files in /bin, /usr/bin, ... that
 * carry the utility stub marker map back to registered utilities.
 */
export class CommandResolver {
    constructor(private fs: FileSystemService) { }

    resolve(name: string, state: TerminalState): ResolvedCommand {
        if (name.includes('/')) return this.inspect(this.fs.resolveAbsolutePath(name, state.currentDirectory), state);

        const path = state.environment.PATH ?? '/usr/bin:/bin';
        let notExecutable: string | undefined;
        for (const rawDir of path.split(':')) {
            const dir = rawDir === '' ? state.currentDirectory : rawDir;
            const candidate = this.fs.resolveAbsolutePath(`${dir}/${name}`, state.currentDirectory);
            const result = this.inspect(candidate, state);
            if (result.kind === 'file') return result;
            if (result.kind === 'not-executable') notExecutable ??= result.path;
        }
        return notExecutable ? { kind: 'not-executable', path: notExecutable } : { kind: 'not-found' };
    }

    /** Every executable named `name` along PATH, in search order (`type -a`). */
    resolveAll(name: string, state: TerminalState): string[] {
        if (name.includes('/')) {
            const r = this.resolve(name, state);
            return r.kind === 'file' ? [r.path] : [];
        }
        const found: string[] = [];
        for (const rawDir of (state.environment.PATH ?? '/usr/bin:/bin').split(':')) {
            const dir = rawDir === '' ? state.currentDirectory : rawDir;
            const r = this.inspect(this.fs.resolveAbsolutePath(`${dir}/${name}`, state.currentDirectory), state);
            if (r.kind === 'file' && !found.includes(r.path)) found.push(r.path);
        }
        return found;
    }

    private inspect(path: string, state: TerminalState): ResolvedCommand {
        let node;
        try {
            node = this.fs.resolve(path, '/');
        } catch {
            return { kind: 'not-found' };
        }
        if (!node) return { kind: 'not-found' };
        if (this.fs.isDirectory(node)) return { kind: 'is-directory', path };
        if (!this.fs.hasAccess(node.inodeId, state.user, X_OK)) return { kind: 'not-executable', path };
        return { kind: 'file', path, utility: this.utilityName(path, state) };
    }

    /** Reads the stub marker (cheap: stubs are tiny). */
    private utilityName(path: string, state: TerminalState): string | undefined {
        try {
            const head = this.fs.readFile(path, '/', state.user);
            if (head.startsWith(UTILITY_STUB_PREFIX)) {
                return head.substring(UTILITY_STUB_PREFIX.length).split('\n')[0].trim();
            }
        } catch {
            /* unreadable: not a stub */
        }
        return undefined;
    }
}
