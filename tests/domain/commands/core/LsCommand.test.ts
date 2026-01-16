import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { LsCommand } from '../../../../src/domain/commands/core/LsCommand';
import { FileSystem } from '../../../../src/domain/entities/FileSystem';
import { createInitialTerminalState } from '../../../../src/domain/entities/TerminalState';

describe('LsCommand', () => {
    let fs: FileSystem;
    let lsCommand: LsCommand;
    let initialState = createInitialTerminalState();

    before(() => {
        fs = new FileSystem();
        // Setup a test file structure
        // /home/operator has 'mail' (dir) and 'notes.txt' (file)
        // We will add a hidden file
        const homeOp = fs.getNode('/home/operator');
        if (homeOp && homeOp.children) {
            homeOp.children['.hidden'] = {
                name: '.hidden',
                type: 'file',
                content: 'secret',
                owner: 'operator',
                permissions: 'rw-------',
                updatedAt: new Date().toISOString()
            };
        }
        lsCommand = new LsCommand(fs);
    });

    it('should list files in current directory', () => {
        const response = lsCommand.execute([], initialState);
        assert.ok(response.output.includes('mail'));
        assert.ok(response.output.includes('notes.txt'));
        assert.strictEqual(response.exitCode, 0);
    });

    it('should not show hidden files by default', () => {
        const response = lsCommand.execute([], initialState);
        assert.ok(!response.output.includes('.hidden'));
    });

    it('should show hidden files with -a flag', () => {
        const response = lsCommand.execute(['-a'], initialState);
        assert.ok(response.output.includes('.hidden'));
        assert.ok(response.output.includes('mail'));
    });

    it('should classify directories with -F flag', () => {
        const response = lsCommand.execute(['-F'], initialState);
        assert.ok(response.output.includes('mail/')); // Directory should have trailing slash
        assert.ok(response.output.includes('notes.txt')); // File should not (unless executable, but basic check)
    });

    it('should list specific directory if argument provided', () => {
        const response = lsCommand.execute(['/bin'], initialState);
        assert.ok(response.output.includes('help'));
    });

    it('should return error if directory does not exist', () => {
        const response = lsCommand.execute(['/nonexistent'], initialState);
        assert.ok(response.output.includes('No such file or directory'));
        assert.strictEqual(response.exitCode, 1);
    });
});
