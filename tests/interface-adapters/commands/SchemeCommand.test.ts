import assert from 'node:assert';
import { describe, it, beforeEach } from 'node:test';
import { SchemeCommand } from '../../../src/interface-adapters/commands/game/SchemeCommand';
import { TerminalState } from '../../../src/domain/entities/TerminalState';
import { ProcessContext } from '../../../src/domain/entities/ProcessContext';
import { FileSystem } from '../../../src/domain/entities/FileSystem';

// Mock FileSystem
class MockFileSystem implements FileSystem {
    private files: Map<string, string> = new Map();

    readFile(path: string, cwd: string): string {
        const fullPath = path.startsWith('/') ? path : `${cwd}/${path}`;
        if (this.files.has(fullPath)) {
            return this.files.get(fullPath)!;
        }
        throw new Error(`File not found: ${fullPath}`);
    }

    // Unused methods stubbed
    readDirectory(path: string): any[] { return []; }
    writeFile(path: string, content: string): void { }
    deleteFile(path: string): void { }
    createDirectory(path: string): void { }
    deleteDirectory(path: string): void { }
    exists(path: string): boolean { return this.files.has(path); }
    isDirectory(path: string): boolean { return false; }
    getMetadata(path: string): any { return {}; }

    // Test helper
    setFile(path: string, content: string) {
        this.files.set(path, content);
    }
}

describe('SchemeCommand', () => {
    let command: SchemeCommand;
    let fs: MockFileSystem;
    let state: TerminalState;
    let context: ProcessContext;

    beforeEach(() => {
        fs = new MockFileSystem();
        command = new SchemeCommand(fs as any);
        state = {
            currentDirectory: '/root',
            history: [],
            outputBuffer: [],
            environment: {},
            user: 'root'
        } as any; // Partial mock
        context = {
            fs: fs as any,
            cwd: '/root',
            env: {},
            user: 'root'
        };
    });

    it('should evaluate an expression string', async () => {
        const res = await command.execute(['(+ 1 2)'], context, state);
        assert.strictEqual(res.output, '3');
        assert.strictEqual(res.exitCode, 0);
    });

    it('should maintain state between calls', async () => {
        await command.execute(['-e', '(define x 10)'], context, state);
        const res = await command.execute(['-e', 'x'], context, state);
        assert.strictEqual(res.output, '10');
    });

    it('should execute a script file', async () => {
        fs.setFile('/root/script.scm', '(define y 20) (* y 2)');
        const res = await command.execute(['script.scm'], context, state);
        assert.strictEqual(res.output, '40');
    });

    it('should load standard library (map)', async () => {
        const res = await command.execute(["(map (lambda (x) (* x x)) '(1 2 3))"], context, state);
        // (1 4 9)
        // schemeToString for list: (1 4 9)
        assert.strictEqual(res.output, '(1 4 9)');
    });
});
