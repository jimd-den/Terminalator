import { RedirectNode } from '../../../interfaces/ShellAST';
import { TerminalState } from '../../../entities/TerminalState';
import { FileSystemService } from '../../FileSystemService';
import { WordExpander, ExpansionScope } from '../expansion/WordExpander';
import { getOption } from '../expansion/ShellVariables';
import { IOContext, inputFromFile, inputFromString } from './IOContext';
import { FileSink } from './FileSink';
import { NullSink } from './OutputSink';

export class RedirectionError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'RedirectionError';
    }
}

/** fd used to keep a handle on the controlling terminal for /dev/tty. */
export const TTY_FD = 255;

/**
 * Redirector - applies a redirect list to a file descriptor table
 * (XCU §2.7), left to right. Pure with respect to the table: returns a new
 * IOContext; files are created/truncated as a side effect, as in POSIX.
 */
export class Redirector {
    constructor(private fs: FileSystemService, private expander: WordExpander) { }

    async apply(redirects: RedirectNode[], scope: ExpansionScope, io: IOContext): Promise<IOContext> {
        let table = io;
        for (const r of redirects) table = await this.applyOne(r, scope, table);
        return table;
    }

    private async applyOne(r: RedirectNode, scope: ExpansionScope, io: IOContext): Promise<IOContext> {
        const state = scope.state;
        const isInput = r.op === '<' || r.op === '<&' || r.op === '<<' || r.op === '<<-' || r.op === '<>';
        const fd = r.fd ?? (isInput ? 0 : 1);

        if (r.op === '<<' || r.op === '<<-') {
            const doc = r.heredoc ?? { body: '', quoted: true };
            const body = doc.quoted ? doc.body : await this.expander.expandHereDoc(doc.body, scope);
            return io.with(fd, { input: inputFromString(body) });
        }

        const target = await this.expander.expandString(r.file, scope);

        if (r.op === '<&' || r.op === '>&') {
            if (target === '-') return io.close(fd);
            if (/^[0-9]+$/.test(target)) {
                const dup = io.dup(fd, parseInt(target, 10));
                if (!dup) throw new RedirectionError(`${target}: Bad file descriptor`);
                return dup;
            }
            if (r.op === '<&') throw new RedirectionError(`${target}: Bad file descriptor`);
            // `>& file` (common extension): stdout and stderr to the file.
            const sink = this.openOutput(target, state, false, true);
            return io.with(1, { output: sink }).with(2, { output: sink });
        }

        if (target === '') throw new RedirectionError("ambiguous redirect");

        const device = this.device(target, io, isInput);
        if (device) return io.with(fd, device);

        if (r.op === '<') {
            const data = this.readFile(target, state);
            const node = this.fs.resolve(this.fs.resolveAbsolutePath(target, state.currentDirectory), '/');
            const size = node ? this.fs.getInode(node.inodeId)?.size ?? data.length : data.length;
            return io.with(fd, { input: inputFromFile(data, size) });
        }
        if (r.op === '<>') {
            const path = this.fs.resolveAbsolutePath(target, state.currentDirectory);
            const exists = !!this.fs.resolve(path, '/');
            const content = exists ? this.readFile(target, state) : '';
            if (!exists) this.openOutput(target, state, true, true);
            return io.with(fd, { input: inputFromString(content), output: this.openOutput(target, state, true, true) });
        }

        const append = r.op === '>>';
        const clobberCheck = r.op === '>' && getOption(state, 'noclobber');
        return io.with(fd, { output: this.openOutput(target, state, append, !clobberCheck) });
    }

    /** Character devices that the redirection layer handles directly. */
    private device(path: string, io: IOContext, isInput: boolean) {
        switch (path) {
            case '/dev/null': return isInput ? { input: inputFromString('') } : { output: new NullSink() };
            case '/dev/stdin': case '/dev/fd/0': return io.get(0);
            case '/dev/stdout': case '/dev/fd/1': return io.get(1);
            case '/dev/stderr': case '/dev/fd/2': return io.get(2);
            case '/dev/tty': return io.get(TTY_FD) ?? io.get(1);
            case '/dev/zero': return isInput ? { input: inputFromString('\0'.repeat(4096)) } : { output: new NullSink() };
        }
        return undefined;
    }

    private readFile(target: string, state: TerminalState): string {
        const path = this.fs.resolveAbsolutePath(target, state.currentDirectory);
        const node = this.fs.resolve(path, '/');
        if (!node) throw new RedirectionError(`${target}: No such file or directory`);
        if (this.fs.isDirectory(node)) throw new RedirectionError(`${target}: Is a directory`);
        try {
            return this.fs.readFile(path, '/', state.user);
        } catch (e: any) {
            throw new RedirectionError(`${target}: ${this.reason(e)}`);
        }
    }

    private openOutput(target: string, state: TerminalState, append: boolean, clobber: boolean) {
        const path = this.fs.resolveAbsolutePath(target, state.currentDirectory);
        const node = this.fs.resolve(path, '/');
        if (node && this.fs.isDirectory(node)) throw new RedirectionError(`${target}: Is a directory`);
        if (node && !clobber) throw new RedirectionError(`${target}: cannot overwrite existing file`);
        try {
            return new FileSink(this.fs, path, state.user, append);
        } catch (e: any) {
            throw new RedirectionError(`${target}: ${this.reason(e)}`);
        }
    }

    private reason(e: any): string {
        const msg = String(e?.message ?? e);
        if (/permission/i.test(msg)) return 'Permission denied';
        if (/no such|not found|ENOENT/i.test(msg)) return 'No such file or directory';
        if (/not a directory/i.test(msg)) return 'Not a directory';
        return msg.replace(/^[A-Z]+:\s*/, '');
    }
}
