
import { strict as assert } from 'assert';
import { AtCommand } from '../../../src/domain/commands/core/AtCommand';
import { BatchCommand } from '../../../src/domain/commands/core/BatchCommand';
import { CrontabCommand } from '../../../src/domain/commands/core/CrontabCommand';
import { FileSystem } from '../../../src/domain/entities/FileSystem';
import { createInitialTerminalState } from '../../../src/domain/entities/TerminalState';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

async function runTests() {
    console.log('Running Scheduling Tests...\n');
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

    const at = new AtCommand(fs);
    const batch = new BatchCommand(fs);
    const crontab = new CrontabCommand(fs);

    // --- At ---
    await runTest('at schedules job', async () => {
        const res = await at.execute(['now', '+', '1', 'minute'], state, 'echo hello');
        assert.equal(res.exitCode, 0);
        assert.ok(res.output.includes('job'));
    });

    // --- Batch ---
    await runTest('batch schedules job', async () => {
        const res = await batch.execute([], state, 'echo hello');
        assert.equal(res.exitCode, 0);
        assert.ok(res.output.includes('job'));
    });

    // --- Crontab ---
    await runTest('crontab lists jobs', async () => {
        const res = await crontab.execute(['-l'], state);
        // "no crontab for operator" typically if empty
        assert.ok(res.output.includes('no crontab') || res.exitCode === 0);
    });

    console.log(`\nResults: ${passed} Passed, ${failed} Failed`);
    if (failed > 0) process.exit(1);
}

runTests().catch(console.error);
