
import { strict as assert } from 'assert';
import { CmpCommand } from '../../../src/domain/commands/core/CmpCommand';
import { FileSystem } from '../../../src/domain/entities/FileSystem';
import { createInitialTerminalState } from '../../../src/domain/entities/TerminalState';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

async function runTests() {
    console.log('Running CmpCommand Tests...\n');
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

    const fs = new FileSystem();
    const cmp = new CmpCommand(fs);
    const state = createInitialTerminalState();

    fs.writeFile('/f1', 'hello', 'w');
    fs.writeFile('/f2', 'hello', 'w');
    fs.writeFile('/f3', 'hella', 'w');

    // 1. Identical files
    await runTest('cmp returns 0 for identical files', async () => {
        const res = await cmp.execute(['/f1', '/f2'], state);
        assert.equal(res.exitCode, 0);
        assert.equal(res.output, '');
    });

    // 2. Different files
    await runTest('cmp returns 1 for different files', async () => {
        const res = await cmp.execute(['/f1', '/f3'], state);
        assert.equal(res.exitCode, 1);
        // Output: file1 file2 differ: byte X, line Y
        assert.ok(res.output.includes('differ'));
        assert.ok(res.output.includes('byte 5'));
    });

    // 3. Skip bytes
    // Not testing complex skips yet, but cmp often supports ignoring initial bytes.
    // We'll stick to basic standard cmp file1 file2

    // 4. Missing file
    await runTest('cmp fails on missing file', async () => {
        const res = await cmp.execute(['/f1', '/missing'], state);
        assert.ok(res.exitCode > 1);
    });

    console.log(`\nResults: ${passed} Passed, ${failed} Failed`);
    if (failed > 0) process.exit(1);
}

runTests().catch(console.error);
