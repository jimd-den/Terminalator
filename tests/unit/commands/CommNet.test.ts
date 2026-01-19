
import { strict as assert } from 'assert';
import { MailxCommand } from '../../../src/domain/commands/core/MailxCommand';
import { MesgCommand } from '../../../src/domain/commands/core/MesgCommand';
import { TalkCommand } from '../../../src/domain/commands/core/TalkCommand';
import { WriteCommand } from '../../../src/domain/commands/core/WriteCommand';
import { FileSystem } from '../../../src/domain/entities/FileSystem';
import { createInitialTerminalState } from '../../../src/domain/entities/TerminalState';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

async function runTests() {
    console.log('Running CommNet Tests...\n');
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

    const mailx = new MailxCommand(fs);
    const mesg = new MesgCommand(fs);
    const talk = new TalkCommand(fs);
    const write = new WriteCommand(fs);

    // --- Mailx ---
    await runTest('mailx lists mail', async () => {
        const res = await mailx.execute([], state);
        assert.equal(res.exitCode, 0);
        assert.ok(res.output.includes('No mail'));
    });

    // --- Mesg ---
    await runTest('mesg sets status', async () => {
        const res = await mesg.execute(['y'], state);
        assert.equal(res.exitCode, 0);
    });

    // --- Talk ---
    await runTest('talk initiates chat', async () => {
        const res = await talk.execute(['user'], state);
        // Simulation: "Checking for invitation..."
        assert.ok(res.output.includes('Checking'));
    });

    // --- Write ---
    await runTest('write sends message', async () => {
        const res = await write.execute(['user'], state, 'hello');
        assert.equal(res.exitCode, 0);
        // "Message from operator..."
        assert.ok(res.output.includes('Message from'));
    });

    console.log(`\nResults: ${passed} Passed, ${failed} Failed`);
    if (failed > 0) process.exit(1);
}

runTests().catch(console.error);
