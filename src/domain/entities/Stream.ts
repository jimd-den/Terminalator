/**
 * Stream - Domain Entity
 *
 * Provides POSIX-style stream abstraction for stdin/stdout/stderr.
 * Replaces simple string buffers with proper read/write semantics.
 *
 * Pillar: The Four-Fold Shield (Clean Architecture - Domain Entity)
 * Pillar: The Swift Stream (Performance - Efficient buffering)
 */

/**
 * IStream - Abstract interface for all stream types.
 * Commands interact with this interface, not concrete implementations.
 */
export interface IStream {
    /**
     * Read all available data from the stream.
     * Returns null if stream is closed and empty.
     */
    read(): string | null;

    /**
     * Read a single line from the stream (up to and including newline).
     * Returns null if no complete line available or stream closed.
     */
    readLine(): string | null;

    /**
     * Write data to the stream.
     */
    write(data: string): void;

    /**
     * Close the stream. No more writes allowed after close.
     */
    close(): void;

    /**
     * Check if stream is closed.
     */
    isClosed(): boolean;

    /**
     * Check if there's data available to read.
     */
    hasData(): boolean;
}

/**
 * StringStream - Simple in-memory stream backed by a string buffer.
 * 
 * Use Case: Capturing command output or providing static input.
 */
export class StringStream implements IStream {
    private buffer: string = '';
    private closed: boolean = false;
    private readPosition: number = 0;

    constructor(initialData: string = '') {
        this.buffer = initialData;
    }

    read(): string | null {
        if (this.readPosition >= this.buffer.length) {
            return this.closed ? null : '';
        }
        const data = this.buffer.substring(this.readPosition);
        this.readPosition = this.buffer.length;
        return data;
    }

    readLine(): string | null {
        if (this.readPosition >= this.buffer.length) {
            return this.closed ? null : '';
        }

        const newlineIndex = this.buffer.indexOf('\n', this.readPosition);
        if (newlineIndex === -1) {
            // No complete line yet
            if (this.closed) {
                // Return remaining data as final "line"
                const line = this.buffer.substring(this.readPosition);
                this.readPosition = this.buffer.length;
                return line.length > 0 ? line : null;
            }
            return null;
        }

        const line = this.buffer.substring(this.readPosition, newlineIndex + 1);
        this.readPosition = newlineIndex + 1;
        return line;
    }

    write(data: string): void {
        if (this.closed) {
            throw new Error('Cannot write to closed stream');
        }
        this.buffer += data;
    }

    close(): void {
        this.closed = true;
    }

    isClosed(): boolean {
        return this.closed;
    }

    hasData(): boolean {
        return this.readPosition < this.buffer.length;
    }

    /**
     * Get all data written to the stream (for output collection).
     */
    getContents(): string {
        return this.buffer;
    }

    /**
     * Get unread data remaining in the buffer.
     */
    getUnread(): string {
        return this.buffer.substring(this.readPosition);
    }
}

/**
 * PipeStream - Two-ended pipe for connecting command stdout to stdin.
 *
 * Use Case: Pipeline connections (cmd1 | cmd2)
 * 
 * The writer writes to the pipe, the reader reads from it.
 * When writer closes, reader can drain remaining data.
 */
export class PipeStream implements IStream {
    private buffer: string[] = [];
    private closed: boolean = false;
    private partial: string = ''; // Incomplete line buffer

    read(): string | null {
        if (this.buffer.length === 0 && this.partial.length === 0) {
            return this.closed ? null : '';
        }

        let result = this.buffer.join('');
        this.buffer = [];

        if (this.closed && this.partial.length > 0) {
            result += this.partial;
            this.partial = '';
        }

        return result;
    }

    readLine(): string | null {
        // Check if we have a complete line in buffer
        for (let i = 0; i < this.buffer.length; i++) {
            const chunk = this.buffer[i];
            const newlineIndex = chunk.indexOf('\n');
            if (newlineIndex !== -1) {
                // Found newline, extract up to and including it
                const line = this.buffer.slice(0, i).join('') + chunk.substring(0, newlineIndex + 1);
                // Keep remainder in buffer
                const remainder = chunk.substring(newlineIndex + 1);
                this.buffer = remainder.length > 0 ? [remainder, ...this.buffer.slice(i + 1)] : this.buffer.slice(i + 1);
                return line;
            }
        }

        // No complete line in buffer
        if (this.closed) {
            // Return remaining as final line
            if (this.buffer.length > 0 || this.partial.length > 0) {
                const line = this.buffer.join('') + this.partial;
                this.buffer = [];
                this.partial = '';
                return line.length > 0 ? line : null;
            }
            return null;
        }

        return null; // No complete line yet
    }

    write(data: string): void {
        if (this.closed) {
            throw new Error('Cannot write to closed pipe');
        }
        this.buffer.push(data);
    }

    close(): void {
        this.closed = true;
    }

    isClosed(): boolean {
        return this.closed;
    }

    hasData(): boolean {
        return this.buffer.length > 0 || this.partial.length > 0;
    }
}

/**
 * NullStream - Discards all writes, returns null on reads.
 * 
 * Use Case: /dev/null equivalent, discarding stderr, etc.
 */
export class NullStream implements IStream {
    read(): string | null { return null; }
    readLine(): string | null { return null; }
    write(_data: string): void { /* discard */ }
    close(): void { }
    isClosed(): boolean { return true; }
    hasData(): boolean { return false; }
}

/**
 * Helper to create a stdin stream from optional string input.
 * Maintains backward compatibility with existing code.
 */
export function createStdinStream(input?: string): IStream {
    const stream = new StringStream(input || '');
    if (input !== undefined) {
        stream.close(); // Input is complete
    }
    return stream;
}

/**
 * Helper to create stdout/stderr capture streams.
 */
export function createOutputStream(): StringStream {
    return new StringStream();
}
