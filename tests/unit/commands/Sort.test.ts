
import { strict as assert } from 'assert';
import { SortCommand } from '../../../src/domain/commands/core/SortCommand';
import { FileSystem } from '../../../src/domain/entities/FileSystem';
import { createInitialTerminalState } from '../../../src/domain/entities/TerminalState';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

async function runTests() {
    console.log('Running SortCommand Tests...\n');
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
    const sort = new SortCommand(fs);
    const state = createInitialTerminalState();

    // 1. Basic Sort
    await runTest('sort sorts lines lexicographically', async () => {
        const input = 'b\na\nc';
        const res = await sort.execute([], state, input);
        assert.equal(res.output, 'a\nb\nc');
    });

    // 2. Reverse (-r)
    await runTest('sort -r sorts reverse', async () => {
        const input = 'a\nb\nc';
        const res = await sort.execute(['-r'], state, input);
        assert.equal(res.output, 'c\nb\na');
    });

    // 3. Numeric (-n)
    await runTest('sort -n sorts numerically', async () => {
        const input = '10\n2\n1';
        const res = await sort.execute(['-n'], state, input);
        assert.equal(res.output, '1\n2\n10');
    });

    // 4. Unique (-u)
    await runTest('sort -u removes duplicates', async () => {
        const input = 'a\na\nb';
        const res = await sort.execute(['-u'], state, input);
        assert.equal(res.output, 'a\nb');
    });

    // 5. File Input
    await runTest('sort reads from file', async () => {
        fs.writeFile('/sort_test.txt', 'z\nx', 'w');
        const res = await sort.execute(['/sort_test.txt'], state);
        assert.equal(res.output, 'x\nz');
    });

    console.log(`\nResults: ${passed} Passed, ${failed} Failed`);
    if (failed > 0) process.exit(1);
}

runTests().catch(console.error);
