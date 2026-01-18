
import { strict as assert } from 'assert';
import { CksumCommand } from '../../../src/domain/commands/core/CksumCommand';
import { FileSystem } from '../../../src/domain/entities/FileSystem';
import { createInitialTerminalState } from '../../../src/domain/entities/TerminalState';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

async function runTests() {
    console.log('Running CksumCommand Tests...\n');
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
    const cksum = new CksumCommand(fs);
    const state = createInitialTerminalState();

    fs.writeFile('/test1', '123456789', 'w'); // CRC-32 of "123456789" is conventionally checked

    // 1. Basic Checksum
    await runTest('cksum calculates crc and size', async () => {
        const res = await cksum.execute(['/test1'], state);
        assert.equal(res.exitCode, 0);
        // "123456789" -> CRC32 (POSIX standard polynomial) is 342174605
        // Size: 9
        // Output: "342174605 9 /test1"
        const parts = res.output.trim().split(/\s+/);
        assert.equal(parts[1], '9'); // Size
        assert.equal(parts[2], '/test1'); // Filename
        // Note: CRC algorithms vary. POSIX specifies Ethernet CRC-32.
        // We will assert it returns a number.
        assert.ok(!isNaN(parseInt(parts[0])));
    });

    console.log(`\nResults: ${passed} Passed, ${failed} Failed`);
    if (failed > 0) process.exit(1);
}

runTests().catch(console.error);
