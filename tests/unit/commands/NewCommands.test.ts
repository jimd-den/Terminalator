import { strict as assert } from 'assert';
import { FileSystem, S_IFIFO } from '../../../src/domain/entities/FileSystem';
import { ExecuteCommand } from '../../../src/domain/usecases/ExecuteCommand';
import { createInitialTerminalState } from '../../../src/domain/entities/TerminalState';

// Helper for colored output
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

async function runTests() {
    console.log('Running New Commands Tests...\n');
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

    // --- Mkfifo Tests ---
    await runTest('Mkfifo: creates a fifo file', async () => {
        const fs = new FileSystem();
        const executor = new ExecuteCommand(fs);
        const state = createInitialTerminalState();

        const res = await executor.execute('mkfifo /pipe', state);
        assert.equal(res.exitCode, 0);

        const dentry = fs.resolveNode('/pipe');
        assert.ok(dentry, 'Dentry should exist');
        const inode = fs.getInode(dentry.inodeId);
        assert.ok(inode?.mode & S_IFIFO, 'Inode should be FIFO');
    });

    await runTest('Mkfifo: handles -m mode', async () => {
        const fs = new FileSystem();
        const executor = new ExecuteCommand(fs);
        const state = createInitialTerminalState();

        const res = await executor.execute('mkfifo -m 600 /securepipe', state);
        assert.equal(res.exitCode, 0);

        const dentry = fs.resolveNode('/securepipe');
        assert.ok(dentry);
        const inode = fs.getInode(dentry.inodeId);
        // Mask with 0777 to check permissions. 600 octal is 384 decimal.
        assert.equal(inode!.mode & 0o777, 0o600);
    });

    // --- File Tests ---
    await runTest('File: identifies directory', async () => {
        const fs = new FileSystem();
        const executor = new ExecuteCommand(fs);
        const state = createInitialTerminalState();

        const res = await executor.execute('file /home', state);
        assert.ok(res.output.includes('directory'));
    });

    await runTest('File: identifies fifo', async () => {
        const fs = new FileSystem();
        const executor = new ExecuteCommand(fs);
        const state = createInitialTerminalState();

        fs.mkfifo('/mypipe');
        const res = await executor.execute('file /mypipe', state);
        assert.ok(res.output.includes('fifo'));
    });

    await runTest('File: identifies text', async () => {
        const fs = new FileSystem();
        const executor = new ExecuteCommand(fs);
        const state = createInitialTerminalState();

        fs.writeFile('/text.txt', 'hello world', 'w');
        const res = await executor.execute('file /text.txt', state);
        if (!res.output.includes('ASCII text')) {
            console.log('Output:', res.output);
            const dentry = fs.resolveNode('/text.txt');
            const inode = fs.getInode(dentry!.inodeId);
            console.log('Inode mode:', inode?.mode.toString(8));
            console.log('Inode size:', inode?.size);
        }
        assert.ok(res.output.includes('ASCII text'));
    });

    // --- Timeout Tests ---
    await runTest('Timeout: runs command successfully', async () => {
        const fs = new FileSystem();
        const executor = new ExecuteCommand(fs);
        const state = createInitialTerminalState();

        const res = await executor.execute('timeout 1s echo hello', state);
        assert.equal(res.exitCode, 0);
        assert.equal(res.output.trim(), 'hello');
    });

    await runTest('Timeout: handles suffix', async () => {
        const fs = new FileSystem();
        const executor = new ExecuteCommand(fs);
        const state = createInitialTerminalState();

        // 1m is long enough for immediate echo
        const res = await executor.execute('timeout 1m echo hello', state);
        assert.equal(res.exitCode, 0);
    });

    // --- Nohup Tests ---
    await runTest('Nohup: returns 1 on missing args', async () => {
        const fs = new FileSystem();
        const executor = new ExecuteCommand(fs);
        const state = createInitialTerminalState();

        const res = await executor.execute('nohup', state);
        assert.equal(res.exitCode, 1);
        assert.ok(res.output.includes('missing operand'));
    });

    console.log(`\nResults: ${passed} Passed, ${failed} Failed`);
    if (failed > 0) process.exit(1);
}

runTests().catch(console.error);
