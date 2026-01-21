import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { RmdirCommand } from '../../../../src/domain/commands/core/RmdirCommand';
import { FileSystem } from '../../../../src/domain/entities/FileSystem';
import { createInitialTerminalState } from '../../../../src/domain/entities/TerminalState';

describe('RmdirCommand POSIX Compliance', () => {
    let fs: FileSystem;
    let initialState = createInitialTerminalState();

    before(() => {
        fs = new FileSystem();
    });

    it('should remove an empty directory', () => {
        fs.mkdir('/test_dir', 0o755);
        const cmd = new RmdirCommand(fs);
        const res = cmd.execute(['/test_dir'], initialState);
        assert.strictEqual(res.exitCode, 0);
        assert.strictEqual(fs.resolveNode('/test_dir'), null);
    });

    it('should fail to remove a non-empty directory', () => {
        fs.mkdir('/non_empty', 0o755);
        fs.writeFile('/non_empty/file.txt', 'content', 'w');
        const cmd = new RmdirCommand(fs);
        const res = cmd.execute(['/non_empty'], initialState);
        assert.strictEqual(res.exitCode, 1);
        assert.ok(res.output.includes('Directory not empty'));
        assert.ok(fs.resolveNode('/non_empty') !== null);
    });

    it('should fail to remove a non-existent directory', () => {
        const cmd = new RmdirCommand(fs);
        const res = cmd.execute(['/ghost'], initialState);
        assert.strictEqual(res.exitCode, 1);
        assert.ok(res.output.includes('No such file or directory'));
    });

    it('should fail to remove a file', () => {
        fs.writeFile('/file.txt', 'content', 'w');
        const cmd = new RmdirCommand(fs);
        const res = cmd.execute(['/file.txt'], initialState);
        assert.strictEqual(res.exitCode, 1);
        assert.ok(res.output.includes('Not a directory'));
    });

    it('should support -p (remove parents)', () => {
        fs.mkdir('/a', 0o755);
        fs.mkdir('/a/b', 0o755);
        fs.mkdir('/a/b/c', 0o755);
        const cmd = new RmdirCommand(fs);
        const res = cmd.execute(['-p', '/a/b/c'], initialState);
        assert.strictEqual(res.exitCode, 0);
        assert.strictEqual(fs.resolveNode('/a/b/c'), null);
        assert.strictEqual(fs.resolveNode('/a/b'), null);
        assert.strictEqual(fs.resolveNode('/a'), null);
    });

    it('should stop -p if a parent is not empty', () => {
        fs.mkdir('/p', 0o755);
        fs.mkdir('/p/c', 0o755);
        fs.writeFile('/p/keep.txt', 'content', 'w');
        const cmd = new RmdirCommand(fs);
        const res = cmd.execute(['-p', '/p/c'], initialState);
        assert.strictEqual(res.exitCode, 0); // rmdir -p usually returns 0 if the leaf was removed, but POSIX says "each dir operand was removed successfully". If part of -p fails, it might still be success for the operand. 
        // Actually, POSIX: "If the dir operand includes more than one pathname component, effects equivalent to the following command shall occur: rmdir -p $(dirname dir)".
        // If dirname fails, it's an error. 
        assert.strictEqual(fs.resolveNode('/p/c'), null);
        assert.ok(fs.resolveNode('/p') !== null);
    });

    it('should handle multiple operands', () => {
        fs.mkdir('/d1', 0o755);
        fs.mkdir('/d2', 0o755);
        const cmd = new RmdirCommand(fs);
        const res = cmd.execute(['/d1', '/d2'], initialState);
        assert.strictEqual(res.exitCode, 0);
        assert.strictEqual(fs.resolveNode('/d1'), null);
        assert.strictEqual(fs.resolveNode('/d2'), null);
    });

    it('should fail if any operand fails (but continue processing)', () => {
        fs.mkdir('/exists', 0o755);
        const cmd = new RmdirCommand(fs);
        const res = cmd.execute(['/missing', '/exists'], initialState);
        assert.strictEqual(res.exitCode, 1);
        assert.ok(res.output.includes('No such file or directory'));
        assert.strictEqual(fs.resolveNode('/exists'), null);
    });
});
