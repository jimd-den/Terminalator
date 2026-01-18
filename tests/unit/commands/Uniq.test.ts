
import { strict as assert } from 'assert';
import { UniqCommand } from '../../../src/domain/commands/core/UniqCommand';
import { FileSystem } from '../../../src/domain/entities/FileSystem';
import { createInitialTerminalState } from '../../../src/domain/entities/TerminalState';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

async function runTests() {
    console.log('Running UniqCommand Tests...\n');
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
    const uniq = new UniqCommand(fs);
    const state = createInitialTerminalState();

    // 1. Basic Uniq
    await runTest('uniq removes adjacent duplicates', async () => {
        const input = 'a\na\nb\na';
        const res = await uniq.execute([], state, input);
        assert.equal(res.output, 'a\nb\na');
    });

    // 2. Count (-c)
    await runTest('uniq -c counts occurrences', async () => {
        const input = 'a\na\nb';
        const res = await uniq.execute(['-c'], state, input);
        // Output format is usually "   count line"
        // Regex to handle flexible spacing
        const lines = res.output.split('\n');
        assert.ok(lines[0].trim().endsWith('a'));
        assert.ok(lines[0].trim().startsWith('2'));
        assert.ok(lines[1].trim().endsWith('b'));
        assert.ok(lines[1].trim().startsWith('1'));
    });

    // 3. Repeated (-d)
    await runTest('uniq -d prints only repeated lines', async () => {
        const input = 'a\na\nb\nc\nc';
        const res = await uniq.execute(['-d'], state, input);
        assert.equal(res.output, 'a\nc');
    });

    // 4. Unique (-u)
    await runTest('uniq -u prints only unique lines', async () => {
        const input = 'a\na\nb\nc\nc';
        const res = await uniq.execute(['-u'], state, input);
        assert.equal(res.output, 'b');
    });

    // 5. File Input
    await runTest('uniq reads from file', async () => {
        fs.writeFile('/uniq_test.txt', 'x\nx', 'w');
        const res = await uniq.execute(['/uniq_test.txt'], state);
        assert.equal(res.output, 'x');
    });

    console.log(`\nResults: ${passed} Passed, ${failed} Failed`);
    if (failed > 0) process.exit(1);
}

runTests().catch(console.error);
