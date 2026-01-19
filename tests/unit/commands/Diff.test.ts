
import { strict as assert } from 'assert';
import { DiffCommand } from '../../../src/domain/commands/core/DiffCommand';
import { FileSystem } from '../../../src/domain/entities/FileSystem';
import { createInitialTerminalState } from '../../../src/domain/entities/TerminalState';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

async function runTests() {
    console.log('Running DiffCommand Tests...\n');
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
    const diff = new DiffCommand(fs);
    const state = createInitialTerminalState();

    fs.writeFile('/a', 'a\nb\nc', 'w');
    fs.writeFile('/b', 'a\nc', 'w');

    // 1. Basic Diff
    await runTest('diff detects changes', async () => {
        const res = await diff.execute(['/a', '/b'], state);
        assert.equal(res.exitCode, 1); // 1 = differences found
        // Expected: 2d1 (delete line 2 of file A to match file B, which is 'b')
        // Or similar output.
        // Diff output:
        // 2d1
        // < b
        const output = res.output;
        assert.ok(output.includes('< b'));
    });

    // 2. Identical
    await runTest('diff returns 0 for identical', async () => {
        const res = await diff.execute(['/a', '/a'], state);
        assert.equal(res.exitCode, 0);
        assert.equal(res.output, '');
    });

    console.log(`\nResults: ${passed} Passed, ${failed} Failed`);
    if (failed > 0) process.exit(1);
}

runTests().catch(console.error);
