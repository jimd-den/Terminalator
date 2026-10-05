/**
 * AwkStreams - awk's named I/O streams (XCU awk "Output Statements",
 * getline, close(), fflush(), system()).
 *
 * Output: `> file` truncates on first open, `>> file` appends, `| cmd` pipes
 * everything printed to the command, which runs (`sh -c cmd`) when the pipe
 * is closed - by close() or at exit. Input: `getline < file` and
 * `cmd | getline` read records from a file or a command's output.
 * "/dev/stdout", "/dev/stderr", "/dev/stdin" and "-" name the standard streams.
 */
import { AwkHost } from './AwkHost';
import { AwkRuntimeError } from './AwkErrors';
import { RecordReader } from './AwkRecords';
import { AwkRegexCache } from './AwkRegex';

type Output =
    | { kind: 'file'; path: string; buffer: string }
    | { kind: 'pipe'; command: string; buffer: string };

type Input = { reader: RecordReader; status: number };

const FLUSH_THRESHOLD = 64 * 1024;

export class AwkStreams {
    private readonly outputs = new Map<string, Output>();
    private readonly inputs = new Map<string, Input>();
    private stdin: RecordReader | null = null;

    constructor(private readonly host: AwkHost, private readonly regexes: AwkRegexCache) { }

    /** The shared standard input reader. */
    stdinReader(): RecordReader {
        if (!this.stdin) this.stdin = new RecordReader(this.host.readStdin(), this.regexes);
        return this.stdin;
    }

    /** print/printf with redirection `mode` to `name`. */
    write(name: string, mode: '>' | '>>' | '|', data: string): void {
        if (mode !== '|') {
            if (name === '/dev/stdout' || name === '-') { this.host.writeStdout(data); return; }
            if (name === '/dev/stderr') { this.host.writeStderr(data); return; }
        }
        let out = this.outputs.get(name);
        if (!out) {
            if (name === '') throw new AwkRuntimeError(`null file name in print or getline`);
            if (mode === '|') {
                out = { kind: 'pipe', command: name, buffer: '' };
            } else {
                const err = this.host.writeFile(name, '', mode === '>>');
                if (err) throw new AwkRuntimeError(`cannot open "${name}" for output (${err})`);
                out = { kind: 'file', path: name, buffer: '' };
            }
            this.outputs.set(name, out);
        }
        out.buffer += data;
        if (out.kind === 'file' && out.buffer.length > FLUSH_THRESHOLD) this.flushOutput(out);
    }

    private flushOutput(out: Output): void {
        if (out.kind !== 'file' || out.buffer === '') return;
        const err = this.host.writeFile(out.path, out.buffer, true);
        out.buffer = '';
        if (err) throw new AwkRuntimeError(`write failure on "${out.path}" (${err})`);
    }

    /** fflush(): all output files, or the named one. Returns 0, or -1 if `name` is not open. */
    flush(name?: string): number {
        if (name === undefined) {
            for (const out of this.outputs.values()) this.flushOutput(out);
            return 0;
        }
        if (name === '/dev/stdout' || name === '/dev/stderr') return 0;
        const out = this.outputs.get(name);
        if (!out) return -1;
        this.flushOutput(out);
        return 0;
    }

    /** Reader for `getline < name`, or null when the file cannot be read. */
    inputFile(name: string): RecordReader | null {
        if (name === '-' || name === '/dev/stdin') return this.stdinReader();
        const open = this.inputs.get(name);
        if (open) return open.reader;
        this.flush();
        const r = this.host.readFile(name);
        if (!r.ok) return null;
        const reader = new RecordReader(r.data, this.regexes);
        this.inputs.set(name, { reader, status: 0 });
        return reader;
    }

    /** Reader for `command | getline`: runs the command on first use. */
    async inputCommand(command: string): Promise<RecordReader> {
        const open = this.inputs.get(command);
        if (open) return open.reader;
        this.flush();
        const res = await this.host.run(command, { capture: true });
        const reader = new RecordReader(res.output, this.regexes);
        this.inputs.set(command, { reader, status: res.status });
        return reader;
    }

    /** system(command): flushes output, runs the command, returns its status. */
    async system(command: string): Promise<number> {
        this.flush();
        return (await this.host.run(command, {})).status;
    }

    /** close(name): returns the command's exit status for pipes, 0 for files, -1 if nothing is open. */
    async close(name: string): Promise<number> {
        let result = -1;
        const input = this.inputs.get(name);
        if (input) {
            this.inputs.delete(name);
            result = input.status;
        }
        const out = this.outputs.get(name);
        if (out) {
            this.outputs.delete(name);
            result = await this.closeOutput(out);
        }
        return result;
    }

    private async closeOutput(out: Output): Promise<number> {
        if (out.kind === 'file') {
            this.flushOutput(out);
            return 0;
        }
        this.flush();
        return (await this.host.run(out.command, { stdin: out.buffer })).status;
    }

    /** At exit: flush files and run pending output pipes, in the order they were opened. */
    async closeAll(): Promise<void> {
        for (const [name, out] of [...this.outputs]) {
            this.outputs.delete(name);
            await this.closeOutput(out);
        }
        this.inputs.clear();
    }
}
