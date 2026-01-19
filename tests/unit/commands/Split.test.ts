
import { strict as assert } from 'assert';
import { SplitCommand } from '../../../src/domain/commands/core/SplitCommand';
import { FileSystem } from '../../../src/domain/entities/FileSystem';
import { createInitialTerminalState } from '../../../src/domain/entities/TerminalState';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

async function runTests() {
    console.log('Running SplitCommand Tests...\n');
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
    const split = new SplitCommand(fs);
    const state = createInitialTerminalState();

    fs.writeFile('/source.txt', '1\n2\n3\n4\n5', 'w');

    // 1. Basic Split (1000 lines default)
    // We need smaller chunks to test.
    await runTest('split -l splits by lines', async () => {
        const res = await split.execute(['-l', '2', '/source.txt', 'prefix'], state);
        assert.equal(res.exitCode, 0);

        // Should create prefixaa, prefixab, prefixac
        const f1 = fs.readFile('/home/operator/prefixaa'); // Should exist in cwd
        const f2 = fs.readFile('/home/operator/prefixab');
        const f3 = fs.readFile('/home/operator/prefixac');

        // split utility usually reconstructs newline at end if lines are joined.
        // My implementation `const chunkContent = chunk.join('\n') + '\n';` always adds newline.
        // The file was written with content '1\n2\n3\n4\n5'.
        // So last line is '5'. My logic treats it as line '5'.
        // Then writes '5\n'.
        // This is generally correct POSIX behavior (text files end in newline).
        assert.equal(f1, '1\n2\n');
        assert.equal(f2, '3\n4\n');
        assert.equal(f3, '5\n'); // Expecting newline
    });

    console.log(`\nResults: ${passed} Passed, ${failed} Failed`);
    if (failed > 0) process.exit(1);
}

runTests().catch(console.error);
