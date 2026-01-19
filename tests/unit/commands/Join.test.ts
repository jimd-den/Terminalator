
import { strict as assert } from 'assert';
import { JoinCommand } from '../../../src/domain/commands/core/JoinCommand';
import { FileSystem } from '../../../src/domain/entities/FileSystem';
import { createInitialTerminalState } from '../../../src/domain/entities/TerminalState';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

async function runTests() {
    console.log('Running JoinCommand Tests...\n');
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
    const join = new JoinCommand(fs);
    const state = createInitialTerminalState();

    fs.writeFile('/j1', '1 a\n2 b', 'w');
    fs.writeFile('/j2', '1 x\n2 y', 'w');

    // 1. Basic Join
    await runTest('join merges on first field', async () => {
        const res = await join.execute(['/j1', '/j2'], state);
        assert.equal(res.exitCode, 0);
        // "1 a x\n2 b y"
        assert.ok(res.output.includes('1 a x'));
        assert.ok(res.output.includes('2 b y'));
    });

    // 2. Missing Pair
    await runTest('join skips unmatchable lines', async () => {
        fs.writeFile('/j3', '1 z', 'w');
        const res = await join.execute(['/j1', '/j3'], state);
        // 1 a z
        // 2 b (no match in j3) -> skipped
        assert.ok(res.output.includes('1 a z'));
        assert.ok(!res.output.includes('2 b'));
    });

    console.log(`\nResults: ${passed} Passed, ${failed} Failed`);
    if (failed > 0) process.exit(1);
}

runTests().catch(console.error);
