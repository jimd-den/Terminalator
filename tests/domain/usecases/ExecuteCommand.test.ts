import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { ExecuteCommand } from '../../../src/domain/usecases/ExecuteCommand';
import { FileSystem } from '../../../src/domain/entities/FileSystem';
import { createInitialTerminalState } from '../../../src/domain/entities/TerminalState';

describe('ExecuteCommand', () => {
    let fs: FileSystem;
    let executor: ExecuteCommand;
    let initialState = createInitialTerminalState();

    before(() => {
        fs = new FileSystem();
        executor = new ExecuteCommand(fs);
    });

    it('should list files with ls', () => {
        const result = executor.execute('ls', initialState);
        // /home/operator has 'mail' and 'notes.txt', but NOT 'bin'.
        // 'bin' is in root.
        assert.ok(result.output.includes('mail'));
        assert.ok(result.output.includes('notes.txt'));
        assert.strictEqual(result.exitCode, 0);
    });

    it('should print working directory with pwd', () => {
        const result = executor.execute('pwd', initialState);
        assert.strictEqual(result.output, '/home/operator');
        assert.strictEqual(result.exitCode, 0);
    });

    it('should change directory with cd', () => {
        const result = executor.execute('cd /', initialState);
        assert.strictEqual(result.newState.currentDirectory, '/');
        assert.strictEqual(result.exitCode, 0);
    });

    it('should return error for unknown command', () => {
        const result = executor.execute('unknown_cmd', initialState);
        assert.ok(result.output.includes('command not found'));
        assert.strictEqual(result.exitCode, 127);
    });
});
