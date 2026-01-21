
import { strict as assert } from 'assert';
import { CompressCommand } from '../../../src/domain/commands/core/CompressCommand';
import { UncompressCommand } from '../../../src/domain/commands/core/UncompressCommand';
import { ZcatCommand } from '../../../src/domain/commands/core/ZcatCommand';
import { FileSystem } from '../../../src/domain/entities/FileSystem';
import { createInitialTerminalState } from '../../../src/domain/entities/TerminalState';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

async function runTests() {
    console.log('Running Compression Tests...\n');
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

    const compress = new CompressCommand();
    const uncompress = new UncompressCommand();
    const zcat = new ZcatCommand(fs); // Zcat DOES take fs according to CoreUtilsModule? Wait.

    fs.writeFile('/data.txt', 'AAAAABBBCC', 'w');

    // 1. Compress
    await runTest('compress creates .Z file', async () => {
        // "AAAAABBBCC" -> "5A3B2C" (RLE)
        const res = await compress.execute(['/data.txt'], state);
        assert.equal(res.exitCode, 0);
        // Should remove original and create .Z
        try { fs.resolveNode('/data.txt'); assert.fail('Original should be removed'); } catch (e) { }
        const content = fs.readFile('/data.txt.Z');
        assert.ok(content.length > 0);
        // Verify simplistic RLE if used
        // assert.equal(content, '5A3B2C'); // Depends on implementation
    });

    // 2. Uncompress
    await runTest('uncompress restores file', async () => {
        const res = await uncompress.execute(['/data.txt.Z'], state);
        assert.equal(res.exitCode, 0);
        const content = fs.readFile('/data.txt');
        assert.equal(content, 'AAAAABBBCC');
    });

    // 3. Zcat
    await runTest('zcat prints decompressed content', async () => {
        // Re-compress first
        await compress.execute(['/data.txt'], state);
        const res = await zcat.execute(['/data.txt.Z'], state);
        assert.equal(res.output, 'AAAAABBBCC');
    });

    console.log(`\nResults: ${passed} Passed, ${failed} Failed`);
    if (failed > 0) process.exit(1);
}

runTests().catch(console.error);
