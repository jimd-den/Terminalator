
import { strict as assert } from 'assert';
import { BasenameCommand } from '../../../src/domain/commands/core/BasenameCommand';
import { DirnameCommand } from '../../../src/domain/commands/core/DirnameCommand';
import { PathchkCommand } from '../../../src/domain/commands/core/PathchkCommand';
import { TrueCommand } from '../../../src/domain/commands/core/TrueCommand';
import { FalseCommand } from '../../../src/domain/commands/core/FalseCommand';
import { FileSystem } from '../../../src/domain/entities/FileSystem';
import { createInitialTerminalState } from '../../../src/domain/entities/TerminalState';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

async function runTests() {
    console.log('Running MoreText Tests...\n');
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
    const state = createInitialTerminalState();

    const basename = new BasenameCommand(fs);
    const dirname = new DirnameCommand(fs);
    const pathchk = new PathchkCommand(fs);
    const trueCmd = new TrueCommand();
    const falseCmd = new FalseCommand();

    // --- Basename ---
    await runTest('basename strips directory and suffix', async () => {
        const res = await basename.execute(['/usr/bin/sort', 'rt'], state);
        assert.equal(res.output, 'so'); // sort -> so
    });

    await runTest('basename strips only directory', async () => {
        const res = await basename.execute(['/usr/bin/sort'], state);
        assert.equal(res.output, 'sort');
    });

    // --- Dirname ---
    await runTest('dirname strips filename', async () => {
        const res = await dirname.execute(['/usr/bin/sort'], state);
        assert.equal(res.output, '/usr/bin');
    });

    // --- Pathchk ---
    await runTest('pathchk checks portability', async () => {
        // Basic check: just valid path chars
        const res = await pathchk.execute(['/valid/path'], state);
        assert.equal(res.exitCode, 0);
    });

    await runTest('pathchk fails on empty', async () => {
        const res = await pathchk.execute([''], state);
        assert.equal(res.exitCode, 1);
    });

    // --- True/False ---
    await runTest('true returns 0', async () => {
        const res = await trueCmd.execute([], state);
        assert.equal(res.exitCode, 0);
    });

    await runTest('false returns 1', async () => {
        const res = await falseCmd.execute([], state);
        assert.equal(res.exitCode, 1);
    });

    console.log(`\nResults: ${passed} Passed, ${failed} Failed`);
    if (failed > 0) process.exit(1);
}

runTests().catch(console.error);
