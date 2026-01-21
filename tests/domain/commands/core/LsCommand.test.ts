import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { LsCommand } from '../../../../src/domain/commands/core/LsCommand';
import { FileSystem } from '../../../../src/domain/entities/FileSystem';
import { FileSystemService } from '../../../../src/domain/services/FileSystemService';
import { createInitialTerminalState } from '../../../../src/domain/entities/TerminalState';

describe('LsCommand', () => {
    let fs: FileSystem;
    let service: FileSystemService;
    let lsCommand: LsCommand;
    let initialState = createInitialTerminalState();

    before(() => {
        fs = new FileSystem();
        service = new FileSystemService(fs);
        // Setup a test file structure
        // /home/operator has 'mail' (dir) and 'notes.txt' (file)
        // We will add a hidden file
        // Create hidden file
        service.writeFile('/home/operator/.hidden', 'secret', 'w', '/');
        // Set permissions manually if writeFile doesn't allow (it defaults to 644 usually)
        service.chmod('/home/operator/.hidden', 0o600, '/');
        lsCommand = new LsCommand(service);
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
