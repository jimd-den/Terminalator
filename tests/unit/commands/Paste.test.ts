
import { strict as assert } from 'assert';
import { PasteCommand } from '../../../src/domain/commands/core/PasteCommand';
import { FileSystem } from '../../../src/domain/entities/FileSystem';
import { createInitialTerminalState } from '../../../src/domain/entities/TerminalState';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

async function runTests() {
    console.log('Running PasteCommand Tests...\n');
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
    const paste = new PasteCommand(fs);
    const state = createInitialTerminalState();

    fs.writeFile('/p1', '1\n2', 'w');
    fs.writeFile('/p2', 'a\nb\nc', 'w');

    // 1. Basic Paste
    await runTest('paste merges files', async () => {
        const res = await paste.execute(['/p1', '/p2'], state);
        assert.equal(res.exitCode, 0);
        assert.equal(res.output, '1\ta\n2\tb\n\tc');
    });

    // 2. Custom Delimiter
    await runTest('paste -d merges with delimiter', async () => {
        const res = await paste.execute(['-d', ',', '/p1', '/p2'], state);
        assert.equal(res.output, '1,a\n2,b\n,c');
    });

    // 3. Serial (-s) - optional, verify if implemented
    await runTest('paste -s concatenates lines', async () => {
        const res = await paste.execute(['-s', '/p1'], state);
        assert.equal(res.output, '1\t2');
    });

    console.log(`\nResults: ${passed} Passed, ${failed} Failed`);
    if (failed > 0) process.exit(1);
}

runTests().catch(console.error);
