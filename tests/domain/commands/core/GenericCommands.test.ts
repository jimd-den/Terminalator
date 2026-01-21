import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { PwdCommand } from '../../../../src/domain/commands/core/PwdCommand';
import { CatCommand } from '../../../../src/domain/commands/core/CatCommand';
import { GrepCommand } from '../../../../src/domain/commands/core/GrepCommand';
import { FileSystem } from '../../../../src/domain/entities/FileSystem';
import { FileSystemService } from '../../../../src/domain/services/FileSystemService';
import { createInitialTerminalState } from '../../../../src/domain/entities/TerminalState';

describe('Generic Core Commands', () => {
    let fs: FileSystem;
    let service: FileSystemService;
    let initialState = createInitialTerminalState();

    before(() => {
        fs = new FileSystem();
        service = new FileSystemService(fs);
    });

    describe('PwdCommand', () => {
        it('should return current working directory', () => {
            const cmd = new PwdCommand(service);
            const res = cmd.execute([], initialState);
            assert.strictEqual(res.output, '/home/operator');
            assert.strictEqual(res.exitCode, 0);
        });
    });

    describe('CatCommand', () => {
        it('should return file content', () => {
            const cmd = new CatCommand(service);
            const res = cmd.execute(['notes.txt'], initialState);
            assert.ok(res.output.includes('System initialized'));
            assert.strictEqual(res.exitCode, 0);
        });

        it('should return error if file not found', () => {
            const cmd = new CatCommand(service);
            const res = cmd.execute(['missing.txt'], initialState);
            assert.ok(res.output.includes('No such file'));
            assert.strictEqual(res.exitCode, 1);
        });
    });

    describe('GrepCommand', () => {
        it('should find pattern in file', () => {
            const cmd = new GrepCommand(service);
            const res = cmd.execute(['System', 'notes.txt'], initialState);
            assert.ok(res.output.includes('System initialized'));
            assert.strictEqual(res.exitCode, 0);
        });

        it('should return empty if pattern not found', () => {
            const cmd = new GrepCommand(service);
            const res = cmd.execute(['Banana', 'notes.txt'], initialState);
            assert.strictEqual(res.output, '');
            // Grep exit code 1 means "not found", but no error.
            assert.strictEqual(res.exitCode, 1);
        });

        it('should return error if file missing', () => {
            const cmd = new GrepCommand(service);
            const res = cmd.execute(['System', 'missing.txt'], initialState);
            assert.ok(res.output.includes('No such file'));
            assert.strictEqual(res.exitCode, 2); // grep usually uses 2 for errors
        });
    });
});
