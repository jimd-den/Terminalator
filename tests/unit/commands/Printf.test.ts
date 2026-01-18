
import { strict as assert } from 'assert';
import { PrintfCommand } from '../../../src/domain/commands/core/PrintfCommand';
import { FileSystem } from '../../../src/domain/entities/FileSystem';
import { createInitialTerminalState } from '../../../src/domain/entities/TerminalState';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

async function runTests() {
    console.log('Running PrintfCommand Tests...\n');
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
    const printf = new PrintfCommand(fs);
    const state = createInitialTerminalState();

    // 1. Basic String
    await runTest('printf prints string', async () => {
        const res = await printf.execute(['hello'], state);
        assert.equal(res.output, 'hello');
    });

    // 2. Newline escape
    await runTest('printf handles \\n', async () => {
        const res = await printf.execute(['hello\\nworld'], state);
        assert.equal(res.output, 'hello\nworld');
    });

    // 3. Format specifiers %s
    await runTest('printf substitutes %s', async () => {
        const res = await printf.execute(['hello %s', 'world'], state);
        assert.equal(res.output, 'hello world');
    });

    // 4. Format %d
    await runTest('printf substitutes %d', async () => {
        const res = await printf.execute(['number %d', '42'], state);
        assert.equal(res.output, 'number 42');
    });

    // 5. Reuse format
    await runTest('printf reuses format string', async () => {
        const res = await printf.execute(['%s\n', 'a', 'b'], state);
        assert.equal(res.output, 'a\nb\n');
    });

    console.log(`\nResults: ${passed} Passed, ${failed} Failed`);
    if (failed > 0) process.exit(1);
}

runTests().catch(console.error);
