
import { strict as assert } from 'assert';
import { UnexpandCommand } from '../../../src/domain/commands/core/UnexpandCommand';
import { FileSystem } from '../../../src/domain/entities/FileSystem';
import { createInitialTerminalState } from '../../../src/domain/entities/TerminalState';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

async function runTests() {
    console.log('Running UnexpandCommand Tests...\n');
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
    const unexpand = new UnexpandCommand(fs);
    const state = createInitialTerminalState();

    // 1. Basic Unexpand (leading spaces only by default)
    await runTest('unexpand converts leading spaces to tabs', async () => {
        // 8 spaces -> 1 tab
        const input = '        a';
        const res = await unexpand.execute([], state, input);
        assert.equal(res.exitCode, 0);
        assert.equal(res.output, '\ta');
    });

    // 2. All spaces (-a)
    await runTest('unexpand -a converts all spaces', async () => {
        // 'a       b' (7 spaces after a). 'a' is pos 0. next tab stop 8.
        // spaces needed = 8 - 1 = 7.
        const input = 'a       b';
        const res = await unexpand.execute(['-a'], state, input);
        assert.equal(res.output, 'a\tb');
    });

    console.log(`\nResults: ${passed} Passed, ${failed} Failed`);
    if (failed > 0) process.exit(1);
}

runTests().catch(console.error);
