import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { CdCommand } from '../../../../src/domain/commands/core/CdCommand';
import { FileSystem } from '../../../../src/domain/entities/FileSystem';
import { createInitialTerminalState } from '../../../../src/domain/entities/TerminalState';

describe('CdCommand', () => {
    let fs: FileSystem;
    let cdCommand: CdCommand;
    let initialState = createInitialTerminalState();

    before(() => {
        fs = new FileSystem();
        cdCommand = new CdCommand(fs);
    });

    it('should change directory to valid child directory', () => {
        const response = cdCommand.execute(['mail'], initialState);
        assert.strictEqual(response.newState.currentDirectory, '/home/operator/mail');
        assert.strictEqual(response.exitCode, 0);
    });

    it('should change directory to absolute path', () => {
        const response = cdCommand.execute(['/bin'], initialState);
        assert.strictEqual(response.newState.currentDirectory, '/bin');
    });

    it('should change to parent directory with ..', () => {
        const startState = { ...initialState, currentDirectory: '/home/operator/mail' };
        const response = cdCommand.execute(['..'], startState);
        assert.strictEqual(response.newState.currentDirectory, '/home/operator');
    });

    it('should change to home directory with no args', () => {
        const startState = { ...initialState, currentDirectory: '/bin' };
        const response = cdCommand.execute([], startState);
        assert.strictEqual(response.newState.currentDirectory, '/home/operator');
    });

    it('should change to home directory with ~', () => {
        const startState = { ...initialState, currentDirectory: '/bin' };
        const response = cdCommand.execute(['~'], startState);
        assert.strictEqual(response.newState.currentDirectory, '/home/operator');
    });

    it('should stay in current directory with .', () => {
        const response = cdCommand.execute(['.'], initialState);
        assert.strictEqual(response.newState.currentDirectory, '/home/operator');
    });

    it('should support previous directory with -', () => {
         // To support this, we need state to track previous directory (OLDPWD env var ideally)
         // But our simulated state might just have history.
         // Standard POSIX 'cd -' relies on OLDPWD.
         // Let's mock OLDPWD in environment
         const startState = {
             ...initialState,
             environment: { ...initialState.environment, OLDPWD: '/bin' }
         };
         const response = cdCommand.execute(['-'], startState);
         assert.strictEqual(response.newState.currentDirectory, '/bin');
         // And it should print the new directory
         assert.strictEqual(response.output, '/bin');
    });

    it('should fail if directory does not exist', () => {
        const response = cdCommand.execute(['/invalid'], initialState);
        assert.ok(response.output.includes('no such file or directory'));
        assert.strictEqual(response.exitCode, 1);
    });
});
