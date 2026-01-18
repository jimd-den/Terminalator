
import { strict as assert } from 'assert';
import { CommCommand } from '../../../src/domain/commands/core/CommCommand';
import { FileSystem } from '../../../src/domain/entities/FileSystem';
import { createInitialTerminalState } from '../../../src/domain/entities/TerminalState';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

async function runTests() {
    console.log('Running CommCommand Tests...\n');
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
    const comm = new CommCommand(fs);
    const state = createInitialTerminalState();

    fs.writeFile('/a', '1\n2\n3', 'w');
    fs.writeFile('/b', '2\n3\n4', 'w');

    // 1. Basic Comm
    await runTest('comm outputs 3 columns', async () => {
        const res = await comm.execute(['/a', '/b'], state);
        assert.equal(res.exitCode, 0);
        // Col 1: lines only in file1 (1)
        // Col 2: lines only in file2 (4)
        // Col 3: lines in both (2, 3)
        // Format: line (col1), \tline (col2), \t\tline (col3)
        // 1
        // \t\t2
        // \t\t3
        // \t4
        const lines = res.output.split('\n');
        assert.ok(lines.includes('1'));
        assert.ok(lines.includes('\t\t2'));
        assert.ok(lines.includes('\t\t3'));
        assert.ok(lines.includes('\t4'));
    });

    // 2. Suppress columns
    await runTest('comm -12 suppresses col 1 and 2', async () => {
        const res = await comm.execute(['-12', '/a', '/b'], state);
        // Only col 3 (common lines)
        assert.equal(res.output, '2\n3');
    });

    await runTest('comm -3 suppresses col 3', async () => {
        const res = await comm.execute(['-3', '/a', '/b'], state);
        // Col 1 and 2
        // 1
        // \t4
        const lines = res.output.split('\n');
        assert.ok(lines.includes('1'));
        assert.ok(lines.includes('\t4'));
        assert.ok(!lines.includes('\t\t2'));
    });

    console.log(`\nResults: ${passed} Passed, ${failed} Failed`);
    if (failed > 0) process.exit(1);
}

runTests().catch(console.error);
