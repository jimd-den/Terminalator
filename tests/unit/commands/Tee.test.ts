
import { strict as assert } from 'assert';
import { TeeCommand } from '../../../src/domain/commands/core/TeeCommand';
import { FileSystem } from '../../../src/domain/entities/FileSystem';
import { createInitialTerminalState } from '../../../src/domain/entities/TerminalState';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

async function runTests() {
    console.log('Running TeeCommand Tests...\n');
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
    const tee = new TeeCommand(fs);
    const state = createInitialTerminalState();

    // 1. Basic Tee
    await runTest('tee writes to file and stdout', async () => {
        const input = 'hello world';
        const res = await tee.execute(['/tee_out.txt'], state, input);
        assert.equal(res.exitCode, 0);
        assert.equal(res.output, input); // Stdout pass-through

        const content = fs.readFile('/tee_out.txt');
        assert.equal(content, input);
    });

    // 2. Append (-a)
    await runTest('tee -a appends to file', async () => {
        fs.writeFile('/tee_append.txt', 'start\n', 'w');
        const input = 'end';
        const res = await tee.execute(['-a', '/tee_append.txt'], state, input);
        assert.equal(res.output, input);

        const content = fs.readFile('/tee_append.txt');
        assert.equal(content, 'start\nend');
    });

    // 3. No file (just pass through)
    await runTest('tee passes through without file', async () => {
        const input = 'echo';
        const res = await tee.execute([], state, input);
        assert.equal(res.output, input);
    });

    console.log(`\nResults: ${passed} Passed, ${failed} Failed`);
    if (failed > 0) process.exit(1);
}

runTests().catch(console.error);
