
import { strict as assert } from 'assert';
import { NlCommand } from '../../../src/domain/commands/core/NlCommand';
import { FileSystem } from '../../../src/domain/entities/FileSystem';
import { createInitialTerminalState } from '../../../src/domain/entities/TerminalState';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

async function runTests() {
    console.log('Running NlCommand Tests...\n');
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
    const nl = new NlCommand(fs);
    const state = createInitialTerminalState();

    fs.writeFile('/nl.txt', 'a\n\nb', 'w');

    // 1. Basic Numbering
    await runTest('nl numbers lines', async () => {
        const res = await nl.execute(['/nl.txt'], state);
        assert.equal(res.exitCode, 0);
        // Default: number non-empty lines
        // 1  a
        //
        // 2  b
        const lines = res.output.split('\n');
        assert.ok(lines[0].trim().startsWith('1'));
        assert.ok(lines[0].includes('a'));
        assert.equal(lines[1].trim(), ''); // Empty line not numbered by default
        assert.ok(lines[2].trim().startsWith('2'));
    });

    // 2. Number all lines (-b a)
    await runTest('nl -b a numbers all lines', async () => {
        const res = await nl.execute(['-b', 'a', '/nl.txt'], state);
        const lines = res.output.split('\n');
        assert.ok(lines[1].trim().startsWith('2')); // Empty line numbered
    });

    console.log(`\nResults: ${passed} Passed, ${failed} Failed`);
    if (failed > 0) process.exit(1);
}

runTests().catch(console.error);
