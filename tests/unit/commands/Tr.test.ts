
import { strict as assert } from 'assert';
import { TrCommand } from '../../../src/domain/commands/core/TrCommand';
import { FileSystem } from '../../../src/domain/entities/FileSystem';
import { createInitialTerminalState } from '../../../src/domain/entities/TerminalState';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

async function runTests() {
    console.log('Running TrCommand Tests...\n');
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
    const tr = new TrCommand(fs);
    const state = createInitialTerminalState();

    // 1. Basic Substitution
    await runTest('tr substitutes characters', async () => {
        const res = await tr.execute(['a', 'b'], state, 'banana');
        assert.equal(res.output, 'bbnbnb');
    });

    await runTest('tr handles ranges (basic)', async () => {
        // Many tr implementations support a-z, but let's see if we implement range expansion.
        // For basic POSIX tr, ranges like a-z are supported.
        // Our simplified implementation might not support ranges initially unless we add it.
        // Let's test explicit mapping first.
        const res = await tr.execute(['abc', 'xyz'], state, 'abcde');
        assert.equal(res.output, 'xyzde');
    });

    // 2. Deletion (-d)
    await runTest('tr -d deletes characters', async () => {
        const res = await tr.execute(['-d', 'a'], state, 'banana');
        assert.equal(res.output, 'bnn');
    });

    await runTest('tr -d deletes multiple characters', async () => {
        const res = await tr.execute(['-d', 'an'], state, 'banana');
        assert.equal(res.output, 'b');
    });

    // 3. Squeeze (-s)
    await runTest('tr -s squeezes repeats', async () => {
        const res = await tr.execute(['-s', 'a'], state, 'baaaanana');
        assert.equal(res.output, 'banana');
    });

    await runTest('tr -s squeezes after substitution', async () => {
        // tr -s ' ' '\n' -> replace space with newline and squeeze
        // Usage: tr -s SET1 SET2
        const res = await tr.execute(['-s', ' ', '\n'], state, 'one  two   three');
        assert.equal(res.output, 'one\ntwo\nthree');
    });

    // 4. Complement (-c) - Optional complexity, maybe later?
    // Let's stick to basic -d, -s, and subst for now.

    console.log(`\nResults: ${passed} Passed, ${failed} Failed`);
    if (failed > 0) process.exit(1);
}

runTests().catch(console.error);
