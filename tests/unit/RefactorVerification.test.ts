
import { strict as assert } from 'assert';
import { ShellParser } from '../../src/domain/services/ShellParser';
import { InodeTable } from '../../src/domain/entities/filesystem/InodeTable';
import { FileSystem } from '../../src/domain/entities/FileSystem';
import { ExecuteCommand } from '../../src/domain/usecases/ExecuteCommand';
import { createInitialTerminalState } from '../../src/domain/entities/TerminalState';

// Helper for colored output
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

async function runTests() {
    console.log('Running Refactor Verification Tests...\n');
    let passed = 0;
    let failed = 0;

    const runTest = async (name: string, fn: () => Promise<void> | void) => {
        try {
            await fn();
            console.log(`${GREEN}[PASS]${RESET} ${name}`);
            passed++;
        } catch (e: any) {
            console.log(`${RED}[FAIL]${RESET} ${name}`);
            console.error(e.message);
            failed++;
        }
    };

    // --- ShellParser Tests (Architecture Refactor) ---
    await runTest('ShellParser: splits pipes correctly', () => {
        const parser = new ShellParser();
        const res = parser.parse("ls -la | grep 'src'");
        assert.equal(res.length, 2);
        assert.equal(res[0].command, 'ls');
        assert.deepEqual(res[0].args, ['-la']);
        assert.equal(res[1].command, 'grep');
        assert.deepEqual(res[1].args, ['src']);
    });

    await runTest('ShellParser: handles quotes in args', () => {
        const parser = new ShellParser();
        const res = parser.parse("echo 'hello world'");
        assert.equal(res[0].command, 'echo');
        assert.deepEqual(res[0].args, ['hello world']);
    });

    // --- InodeTable Tests (FileSystem Refactor) ---
    await runTest('InodeTable: creates and retrieves inodes', () => {
        const table = new InodeTable();
        const inode = table.allocate(0o755, 1000, 1000);
        assert.ok(inode.id > 0);
        const retrieved = table.get(inode.id);
        assert.deepEqual(retrieved, inode);
    });

    // --- New Utilities Tests (Compliance Expansion) ---
    await runTest('Utility: true returns 0', async () => {
        const fs = new FileSystem();
        const executor = new ExecuteCommand(fs);
        const state = createInitialTerminalState();
        const res = await executor.execute('true', state);
        assert.equal(res.exitCode, 0);
    });

    await runTest('Utility: false returns 1', async () => {
        const fs = new FileSystem();
        const executor = new ExecuteCommand(fs);
        const state = createInitialTerminalState();
        const res = await executor.execute('false', state);
        assert.equal(res.exitCode, 1);
    });

    console.log(`\nResults: ${passed} Passed, ${failed} Failed`);
    if (failed > 0) process.exit(1);
}

runTests().catch(console.error);
