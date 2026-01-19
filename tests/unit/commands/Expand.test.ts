
import { strict as assert } from 'assert';
import { ExpandCommand } from '../../../src/domain/commands/core/ExpandCommand';
import { FileSystem } from '../../../src/domain/entities/FileSystem';
import { createInitialTerminalState } from '../../../src/domain/entities/TerminalState';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

async function runTests() {
    console.log('Running ExpandCommand Tests...\n');
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
    const expand = new ExpandCommand(fs);
    const state = createInitialTerminalState();

    // 1. Basic Expand
    await runTest('expand converts tabs to spaces', async () => {
        const input = 'a\tb';
        const res = await expand.execute([], state, input);
        assert.equal(res.exitCode, 0);
        // Default tabstop 8. 'a' is pos 0. next tab stop is 8.
        // Spaces needed = 8 - (1 % 8) = 7.
        // Output: "a       b" (7 spaces)
        assert.equal(res.output, 'a       b');
    });

    // 2. Custom tabstop (-t)
    await runTest('expand -t works', async () => {
        const input = 'a\tb';
        const res = await expand.execute(['-t', '4'], state, input);
        // 'a' is pos 0. next tab stop is 4.
        // Spaces = 4 - 1 = 3.
        assert.equal(res.output, 'a   b');
    });

    console.log(`\nResults: ${passed} Passed, ${failed} Failed`);
    if (failed > 0) process.exit(1);
}

runTests().catch(console.error);
