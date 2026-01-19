
import { strict as assert } from 'assert';
import { BcCommand } from '../../../src/domain/commands/core/BcCommand';
import { GetconfCommand } from '../../../src/domain/commands/core/GetconfCommand';
import { LoggerCommand } from '../../../src/domain/commands/core/LoggerCommand';
import { ManCommand } from '../../../src/domain/commands/core/ManCommand';
import { TabsCommand } from '../../../src/domain/commands/core/TabsCommand';
import { TputCommand } from '../../../src/domain/commands/core/TputCommand';
import { FileSystem } from '../../../src/domain/entities/FileSystem';
import { createInitialTerminalState } from '../../../src/domain/entities/TerminalState';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

async function runTests() {
    console.log('Running MiscTools Tests...\n');
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

    const bc = new BcCommand(fs);
    const getconf = new GetconfCommand(fs);
    const logger = new LoggerCommand(fs);
    const man = new ManCommand(fs);
    const tabs = new TabsCommand(fs);
    const tput = new TputCommand(fs);

    // --- Bc ---
    await runTest('bc calculates', async () => {
        const res = await bc.execute([], state, '1+1');
        assert.equal(res.output, '2');
    });

    // --- Getconf ---
    await runTest('getconf returns val', async () => {
        const res = await getconf.execute(['PATH_MAX'], state);
        assert.equal(res.exitCode, 0);
    });

    // --- Logger ---
    await runTest('logger logs', async () => {
        const res = await logger.execute(['msg'], state);
        assert.equal(res.exitCode, 0);
    });

    // --- Man ---
    await runTest('man shows help', async () => {
        const res = await man.execute(['ls'], state);
        assert.ok(res.output.includes('ls'));
    });

    // --- Tabs ---
    await runTest('tabs sets tabs', async () => {
        const res = await tabs.execute([], state);
        assert.equal(res.exitCode, 0);
    });

    // --- Tput ---
    await runTest('tput controls term', async () => {
        const res = await tput.execute(['clear'], state);
        assert.equal(res.exitCode, 0);
    });

    console.log(`\nResults: ${passed} Passed, ${failed} Failed`);
    if (failed > 0) process.exit(1);
}

runTests().catch(console.error);
