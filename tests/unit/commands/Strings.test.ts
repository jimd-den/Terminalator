
import { strict as assert } from 'assert';
import { StringsCommand } from '../../../src/domain/commands/core/StringsCommand';
import { FileSystem } from '../../../src/domain/entities/FileSystem';
import { createInitialTerminalState } from '../../../src/domain/entities/TerminalState';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

async function runTests() {
    console.log('Running StringsCommand Tests...\n');
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
    const strings = new StringsCommand(fs);
    const state = createInitialTerminalState();

    fs.writeFile('/bin_file', 'abc\x00def\x01ghi\nHello\x00', 'w');

    // 1. Basic Strings
    await runTest('strings extracts printable text', async () => {
        const res = await strings.execute(['/bin_file'], state);
        assert.equal(res.exitCode, 0);
        // Default length 4? POSIX default is 4.
        // "abc" (3) -> skipped
        // "def" (3) -> skipped
        // "ghi" (3) -> skipped
        // "Hello" (5) -> printed
        assert.ok(res.output.includes('Hello'));
        assert.ok(!res.output.includes('abc'));
    });

    // 2. Custom length (-n)
    await runTest('strings -n 3 extracts shorter', async () => {
        const res = await strings.execute(['-n', '3', '/bin_file'], state);
        assert.ok(res.output.includes('abc'));
        assert.ok(res.output.includes('def'));
        assert.ok(res.output.includes('ghi'));
        assert.ok(res.output.includes('Hello'));
    });

    console.log(`\nResults: ${passed} Passed, ${failed} Failed`);
    if (failed > 0) process.exit(1);
}

runTests().catch(console.error);
