import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { RmdirCommand } from '../../../../src/domain/commands/core/RmdirCommand';
import { FileSystem } from '../../../../src/domain/entities/FileSystem';
import { FileSystemService } from '../../../../src/domain/services/FileSystemService';
import { createInitialTerminalState } from '../../../../src/domain/entities/TerminalState';

describe('RmdirCommand POSIX Compliance', () => {
    let fs: FileSystem;
    let service: FileSystemService;
    let initialState = createInitialTerminalState();

    before(() => {
        fs = new FileSystem();
        service = new FileSystemService(fs);
    });

    it('should remove an empty directory', () => {
        service.mkdir('/test_dir', 0o755);
        const cmd = new RmdirCommand(service);
        const res = cmd.execute(['/test_dir'], initialState);
        assert.strictEqual(res.exitCode, 0);
        assert.strictEqual(service.resolve('/test_dir'), null);
    });

    it('should fail to remove a non-empty directory', () => {
        service.mkdir('/non_empty', 0o755);
        service.writeFile('/non_empty/file.txt', 'content', 'w');
        const cmd = new RmdirCommand(service);
        const res = cmd.execute(['/non_empty'], initialState);
        assert.strictEqual(res.exitCode, 1);
        assert.ok(res.output.includes('Directory not empty'));
        assert.ok(service.resolve('/non_empty') !== null);
    });

    it('should fail to remove a non-existent directory', () => {
        const cmd = new RmdirCommand(service);
        const res = cmd.execute(['/ghost'], initialState);
        assert.strictEqual(res.exitCode, 1);
        assert.ok(res.output.includes('No such file or directory'));
    });

    it('should fail to remove a file', () => {
        service.writeFile('/file.txt', 'content', 'w');
        const cmd = new RmdirCommand(service);
        const res = cmd.execute(['/file.txt'], initialState);
        assert.strictEqual(res.exitCode, 1);
        assert.ok(res.output.includes('Not a directory'));
    });

    it('should support -p (remove parents)', () => {
        service.mkdir('/a', 0o755);
        service.mkdir('/a/b', 0o755);
        service.mkdir('/a/b/c', 0o755);
        const cmd = new RmdirCommand(service);
        const res = cmd.execute(['-p', '/a/b/c'], initialState);
        assert.strictEqual(res.exitCode, 0);
        assert.strictEqual(service.resolve('/a/b/c'), null);
        assert.strictEqual(service.resolve('/a/b'), null);
        assert.strictEqual(service.resolve('/a'), null);
    });

    it('should stop -p if a parent is not empty', () => {
        service.mkdir('/p', 0o755);
        service.mkdir('/p/c', 0o755);
        service.writeFile('/p/keep.txt', 'content', 'w');
        const cmd = new RmdirCommand(service);
        const res = cmd.execute(['-p', '/p/c'], initialState);
        assert.strictEqual(res.exitCode, 0); // rmdir -p usually returns 0 if the leaf was removed, but POSIX says "each dir operand was removed successfully". If part of -p fails, it might still be success for the operand. 
        // Actually, POSIX: "If the dir operand includes more than one pathname component, effects equivalent to the following command shall occur: rmdir -p $(dirname dir)".
        // If dirname fails, it's an error. 
        assert.strictEqual(service.resolve('/p/c'), null);
        assert.ok(service.resolve('/p') !== null);
    });

    it('should handle multiple operands', () => {
        service.mkdir('/d1', 0o755);
        service.mkdir('/d2', 0o755);
        const cmd = new RmdirCommand(service);
        const res = cmd.execute(['/d1', '/d2'], initialState);
        assert.strictEqual(res.exitCode, 0);
        assert.strictEqual(service.resolve('/d1'), null);
        assert.strictEqual(service.resolve('/d2'), null);
    });

    it('should fail if any operand fails (but continue processing)', () => {
        service.mkdir('/exists', 0o755);
        const cmd = new RmdirCommand(service);
        const res = cmd.execute(['/missing', '/exists'], initialState);
        assert.strictEqual(res.exitCode, 1);
        assert.ok(res.output.includes('No such file or directory'));
        assert.strictEqual(service.resolve('/exists'), null);
    });
});
