/**
 * Output sinks: where a file descriptor's bytes go (terminal buffer, file,
 * pipe buffer or the bit bucket).
 */
export interface OutputSink {
    write(data: string): void;
    /** Raw bytes; sinks without native byte storage keep them as a latin-1 byte string. */
    writeBytes?(data: Uint8Array): void;
}

const strictUtf8 = new TextDecoder('utf-8', { fatal: true });

/**
 * Stream data convention: bytes that are valid UTF-8 travel as text;
 * anything else (compressed data, raw binary) as a byte string with one
 * char per byte. Consumers turn either back into the same bytes.
 */
export function decodeStream(bytes: Uint8Array): { text: string; binary: boolean } {
    try {
        return { text: strictUtf8.decode(bytes), binary: false };
    } catch {
        return { text: bytesToBinaryString(bytes), binary: true };
    }
}

export function bytesToStreamText(bytes: Uint8Array): string {
    return decodeStream(bytes).text;
}

/** Bytes <-> "byte strings" (one char per byte). */
export function bytesToBinaryString(bytes: Uint8Array): string {
    let s = '';
    for (let i = 0; i < bytes.length; i += 8192) s += String.fromCharCode(...bytes.subarray(i, i + 8192));
    return s;
}

export function binaryStringToBytes(s: string): Uint8Array {
    return Uint8Array.from(s, c => c.charCodeAt(0) & 0xff);
}

/** Bytes of stream data: byte strings map 1:1, text is UTF-8 encoded. */
export function streamToBytes(s: string, binary: boolean): Uint8Array {
    if (binary) return binaryStringToBytes(s);
    return new TextEncoder().encode(s);
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
    /** True once raw (non-UTF-8) bytes were written: contents() is then a byte string. */
    binary = false;

    constructor(private readonly limit = 4 * 1024 * 1024) { }

    write(data: string): void {
        if (!data) return;
        this.size += data.length;
        if (this.size > this.limit) throw new OutputLimitExceeded();
        this.chunks.push(data);
    }

    writeBytes(data: Uint8Array): void {
        const { text, binary } = decodeStream(data);
        if (binary) this.binary = true;
        this.write(text);
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
