import assert from 'node:assert';
import { describe, it, beforeEach } from 'node:test';
import { SchemeCommand } from '../../../src/interface-adapters/commands/game/SchemeCommand';
import { TerminalState } from '../../../src/domain/entities/TerminalState';
import { ProcessContext } from '../../../src/domain/entities/ProcessContext';
import { FileSystem } from '../../../src/domain/entities/FileSystem';

// Mock FileSystem
class MockFileSystem {
    private files: Map<string, string> = new Map();

    readFile(path: string, cwd: string = '/'): string {
        const fullPath = path.startsWith('/') ? path : `${cwd}/${path}`;
        if (this.files.has(fullPath)) {
            return this.files.get(fullPath)!;
        }
        throw new Error(`File not found: ${fullPath}`);
    }

    // Unused methods stubbed
    readDirectory(path: string): any[] { return []; }
    writeFile(path: string, content: string | Uint8Array, modeStr?: 'w' | 'a', cwd?: string): any { return {}; }
    deleteFile(path: string): void { }
    createDirectory(path: string): void { }
    deleteDirectory(path: string): void { }
    exists(path: string): boolean { return this.files.has(path); }
    isDirectory(dentry: any): boolean { return false; }
    getMetadata(path: string): any { return {}; }
    root: any = {};
    resolveNode(path: string, cwd?: string): any { return null; }
    createInode(mode: number, uid: number, gid: number): any { return {}; }
    mkdir(path: string): any { return {}; }
    createFile(path: string): any { return {}; }
    mkfifo(path: string): any { return {}; }
    symlink(target: string, linkPath: string): any { return {}; }
    link(oldPath: string, newPath: string): any { return {}; }
    readlink(path: string): string { return ''; }
    getUsage(): number { return 0; }
    resolve(path: string, cwd?: string): any { return null; }
    getAbsolutePath(dentry: any): string { return ''; }
    getInode(id: number): any { return undefined; }
    deleteNode(path: string): void { }
    chmod(path: string, mode: number): void { }
    chown(path: string, uid: number, gid: number): void { }
    rename(oldPath: string, newPath: string): void { }
    readFileBuffer(path: string): Uint8Array { return new Uint8Array(); }

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
        const res = await command.execute(['(+ 1 2)'], state);
        assert.strictEqual(res.output, '3');
        assert.strictEqual(res.exitCode, 0);
    });

    it('should maintain state between calls', async () => {
        await command.execute(['-e', '(define x 10)'], state);
        const res = await command.execute(['-e', 'x'], state);
        assert.strictEqual(res.output, '10');
    });

    it('should execute a script file', async () => {
        fs.setFile('/root/script.scm', '(define y 20) (* y 2)');
        const res = await command.execute(['script.scm'], state);
        assert.strictEqual(res.output, '40');
    });

    it('should load standard library (map)', async () => {
        const res = await command.execute(["(map (lambda (x) (* x x)) '(1 2 3))"], state);
        // (1 4 9)
        // schemeToString for list: (1 4 9)
        assert.strictEqual(res.output, '(1 4 9)');
    });
});
