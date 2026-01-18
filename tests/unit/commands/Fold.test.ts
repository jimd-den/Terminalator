
import { strict as assert } from 'assert';
import { FoldCommand } from '../../../src/domain/commands/core/FoldCommand';
import { FileSystem } from '../../../src/domain/entities/FileSystem';
import { createInitialTerminalState } from '../../../src/domain/entities/TerminalState';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

async function runTests() {
    console.log('Running FoldCommand Tests...\n');
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
    const fold = new FoldCommand(fs);
    const state = createInitialTerminalState();

    // 1. Basic fold (80 chars default)
    await runTest('fold wraps long lines', async () => {
        const input = 'a'.repeat(90);
        const res = await fold.execute([], state, input);
        assert.equal(res.exitCode, 0);
        const lines = res.output.split('\n');
        assert.equal(lines.length, 2);
        assert.equal(lines[0].length, 80);
        assert.equal(lines[1].length, 10);
    });

    // 2. Custom width (-w)
    await runTest('fold -w wraps at width', async () => {
        const input = '1234567890';
        const res = await fold.execute(['-w', '5'], state, input);
        assert.equal(res.output, '12345\n67890');
    });

    // 3. File Input
    await runTest('fold reads from file', async () => {
        fs.writeFile('/fold.txt', '123456', 'w');
        const res = await fold.execute(['-w', '3', '/fold.txt'], state);
        assert.equal(res.output, '123\n456');
    });

    console.log(`\nResults: ${passed} Passed, ${failed} Failed`);
    if (failed > 0) process.exit(1);
}

runTests().catch(console.error);
