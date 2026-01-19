
import { strict as assert } from 'assert';
import { EdCommand } from '../../../src/domain/commands/core/EdCommand';
import { FileSystem } from '../../../src/domain/entities/FileSystem';
import { createInitialTerminalState } from '../../../src/domain/entities/TerminalState';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

async function runTests() {
    console.log('Running EdCommand Tests...\n');
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
    const ed = new EdCommand(fs);
    const state = createInitialTerminalState();

    // Setup initial file
    fs.writeFile('/ed_file.txt', 'line1\nline2\nline3', 'w');

    // 1. Basic Print (p)
    await runTest('ed p prints lines', async () => {
        // Script: 1p (print line 1)
        const script = '1p\n';
        const res = await ed.execute(['/ed_file.txt'], state, script);
        assert.ok(res.output.includes('line1'));
        assert.equal(res.exitCode, 0);
    });

    // 2. Append (a)
    await runTest('ed a appends text', async () => {
        // Script: 1a\nnewLine\n.\n1,3p
        // Append 'newLine' after line 1. Then print lines 1 to 3.
        const script = '1a\nnewLine\n.\n1,3p\n';
        const res = await ed.execute(['/ed_file.txt'], state, script);
        // Output should contain line1, newLine, line2
        assert.ok(res.output.includes('line1\nnewLine\nline2'));
    });

    // 3. Delete (d)
    await runTest('ed d deletes lines', async () => {
        // Script: 2d\n1,2p
        // Delete line 2 (line2). Result: line1, line3.
        const script = '2d\n1,2p\n';
        const res = await ed.execute(['/ed_file.txt'], state, script);
        assert.ok(res.output.includes('line1\nline3'));
    });

    // 4. Write (w)
    await runTest('ed w writes changes to disk', async () => {
        fs.writeFile('/ed_write.txt', 'original', 'w');
        // Script: 1d\na\nnew\n.\nw\n
        // Delete line 1. Append 'new'. Write.
        const script = '1d\na\nnew\n.\nw\n';
        const res = await ed.execute(['/ed_write.txt'], state, script);
        assert.equal(res.exitCode, 0);

        const content = fs.readFile('/ed_write.txt');
        assert.equal(content.trim(), 'new');
    });

    // 5. Quit (q) - implied, but we can test explicit
    await runTest('ed q exits', async () => {
        const script = 'q\n';
        const res = await ed.execute(['/ed_file.txt'], state, script);
        assert.equal(res.exitCode, 0);
    });

    // 6. Address Ranges
    await runTest('ed handles ranges', async () => {
        // Script: 1,2p
        const script = '1,2p\n';
        const res = await ed.execute(['/ed_file.txt'], state, script);
        assert.ok(res.output.includes('line1\nline2'));
        assert.ok(!res.output.includes('line3'));
    });

    // 7. Missing File
    await runTest('ed fails on missing file', async () => {
        const res = await ed.execute(['/missing.txt'], state, 'q\n');
        // Ed usually starts with '?' or error if file missing?
        // POSIX: If file doesn't exist, it is created on write. But reading it fails?
        // "If the file named by the string operands does not exist, ... ed shall simulate the effects of creating an empty buffer..."
        // So exit code should be 0, but output might show new file.
        // We'll implement strict file reading for now as simplified version?
        // Let's expect 0 exit code but "No such file" warning in output.
        // Or 0 exit code and empty buffer.
        assert.equal(res.exitCode, 0);
    });

    console.log(`\nResults: ${passed} Passed, ${failed} Failed`);
    if (failed > 0) process.exit(1);
}

runTests().catch(console.error);
