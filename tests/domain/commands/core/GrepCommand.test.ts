import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { GrepCommand } from '../../../../src/domain/commands/core/GrepCommand';
import { FileSystem } from '../../../../src/domain/entities/FileSystem';
import { createInitialTerminalState } from '../../../../src/domain/entities/TerminalState';

describe('GrepCommand POSIX Compliance', () => {
    let fs: FileSystem;
    let initialState = createInitialTerminalState();

    before(() => {
        fs = new FileSystem();
        fs.writeFile('/test.txt', 'apple\nbanana\nCherry\napple pie\n', 'w');
        fs.writeFile('/patterns.txt', 'apple\nCherry\n', 'w');
    });

    it('should support -i (case-insensitive)', () => {
        const cmd = new GrepCommand(fs);
        const res = cmd.execute(['-i', 'cherry', '/test.txt'], initialState);
        assert.ok(res.output.includes('Cherry'));
        assert.strictEqual(res.exitCode, 0);
    });

    it('should support -v (invert match)', () => {
        const cmd = new GrepCommand(fs);
        const res = cmd.execute(['-v', 'apple', '/test.txt'], initialState);
        assert.ok(!res.output.includes('apple'));
        assert.ok(res.output.includes('banana'));
        assert.ok(res.output.includes('Cherry'));
    });

    it('should support -c (count)', () => {
        const cmd = new GrepCommand(fs);
        const res = cmd.execute(['-c', 'apple', '/test.txt'], initialState);
        assert.strictEqual(res.output.trim(), '2');
    });

    it('should support -n (line numbers)', () => {
        const cmd = new GrepCommand(fs);
        const res = cmd.execute(['-n', 'banana', '/test.txt'], initialState);
        assert.ok(res.output.includes('2:banana'));
    });

    it('should support -l (list filenames)', () => {
        const cmd = new GrepCommand(fs);
        const res = cmd.execute(['-l', 'apple', '/test.txt'], initialState);
        assert.strictEqual(res.output.trim(), '/test.txt');
    });

    it('should support -x (exact line match)', () => {
        const cmd = new GrepCommand(fs);
        // 'apple' matches 'apple' but not 'apple pie' with -x
        const res = cmd.execute(['-x', 'apple', '/test.txt'], initialState);
        assert.ok(res.output.includes('apple'));
        assert.ok(!res.output.includes('apple pie'));
    });

    it('should support -F (fixed strings)', () => {
        const cmd = new GrepCommand(fs);
        fs.writeFile('/regex.txt', 'a.c\nabc\n', 'w');
        const res = cmd.execute(['-F', 'a.c', '/regex.txt'], initialState);
        assert.ok(res.output.includes('a.c'));
        assert.ok(!res.output.includes('abc'));
    });

    it('should support -E (extended regex)', () => {
        const cmd = new GrepCommand(fs);
        const res = cmd.execute(['-E', 'apple|banana', '/test.txt'], initialState);
        assert.ok(res.output.includes('apple'));
        assert.ok(res.output.includes('banana'));
    });

    it('should support multiple -e patterns', () => {
        const cmd = new GrepCommand(fs);
        const res = cmd.execute(['-e', 'apple', '-e', 'Cherry', '/test.txt'], initialState);
        assert.ok(res.output.includes('apple'));
        assert.ok(res.output.includes('Cherry'));
    });

    it('should support -f pattern file', () => {
        const cmd = new GrepCommand(fs);
        const res = cmd.execute(['-f', '/patterns.txt', '/test.txt'], initialState);
        assert.ok(res.output.includes('apple'));
        assert.ok(res.output.includes('Cherry'));
    });

    it('should support -q (quiet mode)', () => {
        const cmd = new GrepCommand(fs);
        const res = cmd.execute(['-q', 'apple', '/test.txt'], initialState);
        assert.strictEqual(res.output, '');
        assert.strictEqual(res.exitCode, 0);
    });

    it('should support -s (suppress errors)', () => {
        const cmd = new GrepCommand(fs);
        const res = cmd.execute(['-s', 'apple', '/nonexistent.txt'], initialState);
        assert.strictEqual(res.output, '');
        assert.strictEqual(res.exitCode, 2);
    });

    it('should handle multiple patterns separated by newline in pattern_list', () => {
        const cmd = new GrepCommand(fs);
        const res = cmd.execute(['apple\nbanana', '/test.txt'], initialState);
        assert.ok(res.output.includes('apple'));
        assert.ok(res.output.includes('banana'));
    });
});
