import { IStream, StringStream } from '../../../entities/Stream';
import { OutputSink, ClosedSink } from './OutputSink';

/** An open file description as seen through one descriptor number. */
export interface FileDescriptor {
    input?: IStream;
    output?: OutputSink;
}

/**
 * Standard input attached to the interactive terminal. The simulation has
 * no keyboard stream for running commands, so reads see end-of-file; the
 * marker lets legacy utilities distinguish "no stdin" from "empty pipe".
 */
export class TtyInput extends StringStream {
    readonly isTty = true;
    constructor() {
        super('');
        this.close();
    }
}

export function isTty(stream: IStream): boolean {
    return (stream as TtyInput).isTty === true;
}

const EMPTY_INPUT = (): IStream => {
    const s = new StringStream('');
    s.close();
    return s;
};

/**
 * IOContext - the per-command file descriptor table.
 *
 * Immutable from the caller's point of view: `with`/`dup`/`close` return a
 * new table, so redirections apply only to the command they belong to.
 * Streams themselves are shared (a `read` consumes from the same stdin the
 * enclosing `while` loop reads from), exactly like inherited fds.
 */
export class IOContext {
    private constructor(private readonly fds: ReadonlyMap<number, FileDescriptor>) { }

    static create(stdin: IStream | undefined, stdout: OutputSink, stderr: OutputSink = stdout): IOContext {
        return new IOContext(new Map([
            [0, { input: stdin ?? EMPTY_INPUT() }],
            [1, { output: stdout }],
            [2, { output: stderr }],
        ]));
    }

    get stdin(): IStream {
        return this.fds.get(0)?.input ?? EMPTY_INPUT();
    }

    get stdout(): OutputSink {
        return this.fds.get(1)?.output ?? new ClosedSink(1);
    }

    get stderr(): OutputSink {
        return this.fds.get(2)?.output ?? new ClosedSink(2);
    }

    /** True when `fd` writes to the controlling terminal (fd 255 holds the tty). */
    isatty(fd: number): boolean {
        const tty = this.fds.get(255)?.output;
        return !!tty && this.fds.get(fd)?.output === tty;
    }

    get(fd: number): FileDescriptor | undefined {
        return this.fds.get(fd);
    }

    with(fd: number, desc: FileDescriptor): IOContext {
        const next = new Map(this.fds);
        next.set(fd, desc);
        return new IOContext(next);
    }

    /** `target>&source` / `target<&source` */
    dup(target: number, source: number): IOContext | null {
        const desc = this.fds.get(source);
        if (!desc) return null;
        return this.with(target, desc);
    }

    close(fd: number): IOContext {
        const next = new Map(this.fds);
        next.delete(fd);
        return new IOContext(next);
    }

    withStdin(stream: IStream): IOContext {
        return this.with(0, { input: stream });
    }

    withStdout(sink: OutputSink): IOContext {
        return this.with(1, { output: sink });
    }
}

export function inputFromString(data: string, binary = false): IStream {
    const s = new StringStream(data);
    s.close();
    if (binary) (s as BinaryMarked).binary = true;
    return s;
}

type BinaryMarked = IStream & { binary?: boolean; fileSize?: number };

/** Input redirected from a regular file (`< file`): what fstat() would report as its size. */
export function inputFromFile(data: string, size: number, binary = false): IStream {
    const s = inputFromString(data, binary) as BinaryMarked;
    s.fileSize = size;
    return s;
}

export function regularFileSize(stream: IStream): number | undefined {
    return (stream as BinaryMarked).fileSize;
}

/** Whether a stream carries a byte string (see OutputSink stream convention). */
export function isBinaryStream(stream: IStream): boolean {
    return (stream as BinaryMarked).binary === true;
}
