
import { strict as assert } from 'assert';
import { PrCommand } from '../../../src/domain/commands/core/PrCommand';
import { FileSystem } from '../../../src/domain/entities/FileSystem';
import { createInitialTerminalState } from '../../../src/domain/entities/TerminalState';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

async function runTests() {
    console.log('Running PrCommand Tests...\n');
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
    const pr = new PrCommand(fs);
    const state = createInitialTerminalState();

    fs.writeFile('/pr.txt', 'line1\nline2', 'w');

    // 1. Basic Pr
    await runTest('pr paginates output', async () => {
        const res = await pr.execute(['/pr.txt'], state);
        assert.equal(res.exitCode, 0);
        // Header contains date, page, file
        assert.ok(res.output.includes('Page 1'));
        assert.ok(res.output.includes('line1'));
    });

    console.log(`\nResults: ${passed} Passed, ${failed} Failed`);
    if (failed > 0) process.exit(1);
}

runTests().catch(console.error);
