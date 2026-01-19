
import { strict as assert } from 'assert';
import { ExprCommand } from '../../../src/domain/commands/core/ExprCommand';
import { TestCommand } from '../../../src/domain/commands/core/TestCommand';
import { OdCommand } from '../../../src/domain/commands/core/OdCommand';
import { UuencodeCommand } from '../../../src/domain/commands/core/UuencodeCommand';
import { UudecodeCommand } from '../../../src/domain/commands/core/UudecodeCommand';
import { FileSystem } from '../../../src/domain/entities/FileSystem';
import { createInitialTerminalState } from '../../../src/domain/entities/TerminalState';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

async function runTests() {
    console.log('Running Processing Tests...\n');
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
    const state = createInitialTerminalState();

    const expr = new ExprCommand(fs);
    const testCmd = new TestCommand(fs); // 'test' is reserved keyword? No.
    const od = new OdCommand(fs);
    const uuencode = new UuencodeCommand(fs);
    const uudecode = new UudecodeCommand(fs);

    // --- Expr ---
    await runTest('expr adds numbers', async () => {
        const res = await expr.execute(['1', '+', '2'], state);
        assert.equal(res.output, '3');
    });

    await runTest('expr compares numbers', async () => {
        const res = await expr.execute(['10', '>', '2'], state);
        assert.equal(res.output, '1'); // 1 is true
    });

    // --- Test ([) ---
    await runTest('test checks file existence -e', async () => {
        fs.writeFile('/exists', 'y', 'w');
        const res = await testCmd.execute(['-e', '/exists'], state);
        assert.equal(res.exitCode, 0); // 0 is true
    });

    await runTest('test fails on missing file', async () => {
        const res = await testCmd.execute(['-e', '/missing'], state);
        assert.equal(res.exitCode, 1); // 1 is false
    });

    await runTest('test compares strings', async () => {
        const res = await testCmd.execute(['abc', '=', 'abc'], state);
        assert.equal(res.exitCode, 0);
    });

    // --- Od ---
    await runTest('od prints octal dump', async () => {
        const input = 'abc';
        const res = await od.execute([], state, input);
        // Default output is octal bytes or shorts?
        // POSIX default: -t o2 (octal 2-byte units)
        // 0000000 061141 000143
        // We'll verify it produces some octal output.
        assert.ok(res.output.match(/^[0-7\s]+$/m));
    });

    // --- Uuencode/Uudecode ---
    await runTest('uuencode encodes data', async () => {
        // uuencode [infile] remote_file
        // if no infile, read stdin
        const res = await uuencode.execute(['decoded.txt'], state, 'Cat');
        // begin 644 decoded.txt
        // #0V%T
        // `
        // end
        assert.ok(res.output.includes('begin 644 decoded.txt'));
        assert.ok(res.output.includes('end'));
    });

    await runTest('uudecode decodes data', async () => {
        const encoded = 'begin 644 decoded.txt\n#0V%T\n`\nend';
        fs.writeFile('/encoded.uue', encoded, 'w');
        await uudecode.execute(['/encoded.uue'], state);

        // Should create decoded.txt
        const content = fs.readFile('/home/operator/decoded.txt'); // Assuming writes to CWD
        assert.equal(content, 'Cat');
    });

    console.log(`\nResults: ${passed} Passed, ${failed} Failed`);
    if (failed > 0) process.exit(1);
}

runTests().catch(console.error);
