
import { strict as assert } from 'assert';
import { JobsCommand } from '../../../src/domain/commands/core/JobsCommand';
import { KillCommand } from '../../../src/domain/commands/core/KillCommand';
import { PsCommand } from '../../../src/domain/commands/core/PsCommand';
import { WaitCommand } from '../../../src/domain/commands/core/WaitCommand';
import { FileSystem } from '../../../src/domain/entities/FileSystem';
import { createInitialTerminalState } from '../../../src/domain/entities/TerminalState';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

async function runTests() {
    console.log('Running MoreProc Tests...\n');
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

    const jobs = new JobsCommand(fs);
    const kill = new KillCommand(fs);
    const ps = new PsCommand(fs);
    const wait = new WaitCommand(fs);

    // --- Jobs ---
    await runTest('jobs lists empty', async () => {
        const res = await jobs.execute([], state);
        assert.equal(res.exitCode, 0);
    });

    // --- Ps ---
    await runTest('ps lists current shell', async () => {
        const res = await ps.execute([], state);
        assert.ok(res.output.includes('PID'));
        assert.ok(res.output.includes('sh'));
    });

    // --- Kill ---
    await runTest('kill simulates signal', async () => {
        const res = await kill.execute(['1234'], state);
        assert.equal(res.exitCode, 0); // Simulated success
    });

    // --- Wait ---
    await runTest('wait returns', async () => {
        const res = await wait.execute([], state);
        assert.equal(res.exitCode, 0);
    });

    console.log(`\nResults: ${passed} Passed, ${failed} Failed`);
    if (failed > 0) process.exit(1);
}

runTests().catch(console.error);
