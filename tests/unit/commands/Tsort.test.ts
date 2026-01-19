
import { strict as assert } from 'assert';
import { TsortCommand } from '../../../src/domain/commands/core/TsortCommand';
import { FileSystem } from '../../../src/domain/entities/FileSystem';
import { createInitialTerminalState } from '../../../src/domain/entities/TerminalState';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

async function runTests() {
    console.log('Running TsortCommand Tests...\n');
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
    const tsort = new TsortCommand(fs);
    const state = createInitialTerminalState();

    // 1. Basic Tsort
    // Input: pairs "a b" means a before b
    await runTest('tsort sorts topologically', async () => {
        const input = 'a b\nb c';
        const res = await tsort.execute([], state, input);
        assert.equal(res.exitCode, 0);
        // Order: a, b, c
        assert.equal(res.output, 'a\nb\nc');
    });

    // 2. Cycle detection (should print to stderr/output message? POSIX says diagnostic)
    // tsort often continues or fails.
    // For simple implementation, undefined behavior or arbitrary break.
    // "a b\nb a" -> a b or b a?
    await runTest('tsort handles cycles gracefully', async () => {
        const input = 'a b\nb a';
        const res = await tsort.execute([], state, input);
        assert.equal(res.exitCode, 0); // usually doesn't crash
        // Should output all nodes
        assert.ok(res.output.includes('a'));
        assert.ok(res.output.includes('b'));
    });

    console.log(`\nResults: ${passed} Passed, ${failed} Failed`);
    if (failed > 0) process.exit(1);
}

runTests().catch(console.error);
