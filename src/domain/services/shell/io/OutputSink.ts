/**
 * Output sinks: where a file descriptor's bytes go (terminal buffer, file,
 * pipe buffer or the bit bucket).
 */
export interface OutputSink {
    write(data: string): void;
}

/** Thrown when a runaway command (e.g. `yes` without a reader) exceeds the cap. */
export class OutputLimitExceeded extends Error {
    constructor() {
        super('output limit exceeded');
        this.name = 'OutputLimitExceeded';
    }
}

/** In-memory sink, used for the terminal, pipes and command substitution. */
export class BufferSink implements OutputSink {
    private chunks: string[] = [];
    private size = 0;

    constructor(private readonly limit = 4 * 1024 * 1024) { }

    write(data: string): void {
        if (!data) return;
        this.size += data.length;
        if (this.size > this.limit) throw new OutputLimitExceeded();
        this.chunks.push(data);
    }

    contents(): string {
        if (this.chunks.length > 1) this.chunks = [this.chunks.join('')];
        return this.chunks[0] ?? '';
    }
}

export class NullSink implements OutputSink {
    write(_data: string): void { /* discarded */ }
}

/** A closed descriptor: writing to it is an error (EBADF). */
export class ClosedSink implements OutputSink {
    constructor(private readonly fd: number) { }
    write(_data: string): void {
        throw new Error(`${this.fd}: Bad file descriptor`);
    }
}
