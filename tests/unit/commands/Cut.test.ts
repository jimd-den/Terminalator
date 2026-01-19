
import { strict as assert } from 'assert';
import { CutCommand } from '../../../src/domain/commands/core/CutCommand';
import { FileSystem } from '../../../src/domain/entities/FileSystem';
import { createInitialTerminalState } from '../../../src/domain/entities/TerminalState';

// Helper for colored output
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

async function runTests() {
    console.log('Running CutCommand Tests...\n');
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
    const cut = new CutCommand(fs);
    const state = createInitialTerminalState();

    // 1. Basic Byte/Character Selection (-b / -c)
    // Note: Assuming -c behaves like -b for ASCII as per standard for naive implementations
    await runTest('cut -b 1: select first byte', async () => {
        const res = await cut.execute(['-b', '1'], state, 'hello');
        assert.equal(res.output, 'h');
        assert.equal(res.exitCode, 0);
    });

    await runTest('cut -b 1-3: select range', async () => {
        const res = await cut.execute(['-b', '1-3'], state, 'hello');
        assert.equal(res.output, 'hel');
    });

    await runTest('cut -b -3: select start to 3', async () => {
        const res = await cut.execute(['-b', '-3'], state, 'hello');
        assert.equal(res.output, 'hel');
    });

    await runTest('cut -b 3-: select 3 to end', async () => {
        const res = await cut.execute(['-b', '3-'], state, 'hello');
        assert.equal(res.output, 'llo');
    });

    await runTest('cut -b 1,3,5: select list', async () => {
        const res = await cut.execute(['-b', '1,3,5'], state, 'hello');
        assert.equal(res.output, 'hlo');
    });

    // 2. Field Selection (-f)
    await runTest('cut -f 1: select first field (default tab)', async () => {
        const res = await cut.execute(['-f', '1'], state, 'col1\tcol2');
        assert.equal(res.output, 'col1');
    });

    await runTest('cut -f 2: select second field', async () => {
        const res = await cut.execute(['-f', '2'], state, 'col1\tcol2');
        assert.equal(res.output, 'col2');
    });

    await runTest('cut -d " " -f 2: custom delimiter', async () => {
        const res = await cut.execute(['-d', ' ', '-f', '2'], state, 'col1 col2');
        assert.equal(res.output, 'col2');
    });

    await runTest('cut -f 1-2: field range', async () => {
        const res = await cut.execute(['-f', '1-2', '-d', ','], state, 'a,b,c');
        assert.equal(res.output, 'a,b');
    });

    // 3. File Input
    await runTest('cut reads from file', async () => {
        fs.writeFile('/cut_test.txt', 'f1:f2', 'w');
        const res = await cut.execute(['-d', ':', '-f', '1', '/cut_test.txt'], state);
        assert.equal(res.output, 'f1');
    });

    // 4. Error Handling
    await runTest('cut fails without list', async () => {
        const res = await cut.execute([], state, 'input');
        assert.equal(res.exitCode, 1);
        if (!res.output.includes('specify a list')) {
            throw new Error(`Expected output to include "specify a list", got: "${res.output}"`);
        }
    });

    await runTest('cut fails with both -b and -f', async () => {
        const res = await cut.execute(['-b', '1', '-f', '1'], state, 'input');
        assert.equal(res.exitCode, 1);
    });

    console.log(`\nResults: ${passed} Passed, ${failed} Failed`);
    if (failed > 0) process.exit(1);
}

runTests().catch(console.error);
