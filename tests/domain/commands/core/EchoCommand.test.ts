import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { EchoCommand } from '../../../../src/domain/commands/core/EchoCommand';
import { FileSystem } from '../../../../src/domain/entities/FileSystem';
import { FileSystemService } from '../../../../src/domain/services/FileSystemService';
import { createInitialTerminalState } from '../../../../src/domain/entities/TerminalState';

describe('EchoCommand POSIX Compliance', () => {
    let fs: FileSystem;
    let service: FileSystemService;
    let initialState = createInitialTerminalState();

    before(() => {
        fs = new FileSystem();
        service = new FileSystemService(fs);
    });

    it('should print basic strings separated by space', () => {
        const cmd = new EchoCommand(service);
        const res = cmd.execute(['hello', 'world'], initialState);
        assert.strictEqual(res.exitCode, 0);
        assert.strictEqual(res.output, 'hello world\n');
    });

    it('should print a newline if no arguments provided', () => {
        const cmd = new EchoCommand(service);
        const res = cmd.execute([], initialState);
        assert.strictEqual(res.exitCode, 0);
        assert.strictEqual(res.output, '\n');
    });

    it('should treat -- as a literal string', () => {
        const cmd = new EchoCommand(service);
        const res = cmd.execute(['--', 'foo'], initialState);
        assert.strictEqual(res.output, '-- foo\n');
    });

    it('should treat -n as a literal string (POSIX strict)', () => {
        const cmd = new EchoCommand(service);
        const res = cmd.execute(['-n', 'foo'], initialState);
        assert.strictEqual(res.output, '-n foo\n');
    });

    it('should process XSI escape sequences: \\n', () => {
        const cmd = new EchoCommand(service);
        const res = cmd.execute(['line1\\nline2'], initialState);
        assert.strictEqual(res.output, 'line1\nline2\n');
    });

    it('should process XSI escape sequences: \\t', () => {
        const cmd = new EchoCommand(service);
        const res = cmd.execute(['a\\tb'], initialState);
        assert.strictEqual(res.output, 'a\tb\n');
    });

    it('should process XSI escape sequences: \\\\ (backslash)', () => {
        const cmd = new EchoCommand(service);
        const res = cmd.execute(['a\\\\b'], initialState);
        assert.strictEqual(res.output, 'a\\b\n');
    });

    it('should handle \\c (suppress newline and truncate)', () => {
        const cmd = new EchoCommand(service);
        const res = cmd.execute(['hello\\cworld', 'extra'], initialState);
        assert.strictEqual(res.output, 'hello');
    });

    it('should handle octal escape sequences: \\0num', () => {
        const cmd = new EchoCommand(service);
        const res = cmd.execute(['\\0101'], initialState);
        assert.strictEqual(res.output, 'A\n');
    });
});
