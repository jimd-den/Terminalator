
import { strict as assert } from 'assert';
import { SleepCommand } from '../../../src/domain/commands/core/SleepCommand';
import { UnameCommand } from '../../../src/domain/commands/core/UnameCommand';
import { LognameCommand } from '../../../src/domain/commands/core/LognameCommand';
import { EnvCommand } from '../../../src/domain/commands/core/EnvCommand';
import { CalCommand } from '../../../src/domain/commands/core/CalCommand';
import { FileSystem } from '../../../src/domain/entities/FileSystem';
import { createInitialTerminalState } from '../../../src/domain/entities/TerminalState';

// Helper for colored output
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

async function runTests() {
    console.log('Running SystemEnv Tests...\n');
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

    const sleep = new SleepCommand(fs);
    const uname = new UnameCommand(fs);
    const logname = new LognameCommand(fs);
    const env = new EnvCommand(fs);
    const cal = new CalCommand(fs);

    // --- Sleep ---
    await runTest('sleep delays execution', async () => {
        const start = Date.now();
        // sleep 0.1s
        await sleep.execute(['0.1'], state);
        const end = Date.now();
        assert.ok((end - start) >= 90); // Allow roughly 100ms
    });

    // --- Uname ---
    await runTest('uname prints system info', async () => {
        const res = await uname.execute([], state);
        assert.ok(res.output.length > 0);
        // Default "Terminalator"? Or "Linux"?
        // POSIX default is implementation defined.
    });

    await runTest('uname -a prints all', async () => {
        const res = await uname.execute(['-a'], state);
        assert.ok(res.output.includes(' ')); // Multiple fields
    });

    // --- Logname ---
    await runTest('logname prints user', async () => {
        const res = await logname.execute([], state);
        assert.equal(res.output, 'operator');
    });

    // --- Env ---
    await runTest('env prints environment', async () => {
        const res = await env.execute([], state);
        assert.ok(res.output.includes('PATH='));
    });

    // --- Cal ---
    await runTest('cal prints calendar', async () => {
        const res = await cal.execute([], state);
        assert.ok(res.output.includes('Su Mo Tu We Th Fr Sa'));
    });

    console.log(`\nResults: ${passed} Passed, ${failed} Failed`);
    if (failed > 0) process.exit(1);
}

runTests().catch(console.error);
