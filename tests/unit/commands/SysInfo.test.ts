
import { strict as assert } from 'assert';
import { WhoCommand } from '../../../src/domain/commands/core/WhoCommand';
import { TtyCommand } from '../../../src/domain/commands/core/TtyCommand';
import { IdCommand } from '../../../src/domain/commands/core/IdCommand';
import { FileSystem } from '../../../src/domain/entities/FileSystem';
import { createInitialTerminalState } from '../../../src/domain/entities/TerminalState';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

async function runTests() {
    console.log('Running SysInfo Tests...\n');
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

    const who = new WhoCommand(fs);
    const tty = new TtyCommand(fs);
    const id = new IdCommand(fs);

    // --- Who ---
    await runTest('who prints user info', async () => {
        const res = await who.execute([], state);
        assert.equal(res.exitCode, 0);
        // Default format: name [state] line time [activity] [pid] [comment] [exit]
        // Simplified: user terminal date
        assert.ok(res.output.includes('operator'));
        assert.ok(res.output.includes('tty1'));
    });

    // --- Tty ---
    await runTest('tty prints terminal name', async () => {
        const res = await tty.execute([], state);
        assert.equal(res.exitCode, 0);
        assert.equal(res.output, '/dev/tty1');
    });

    // --- Id ---
    await runTest('id prints user identity', async () => {
        const res = await id.execute([], state);
        assert.equal(res.exitCode, 0);
        // uid=1000(operator) gid=1000(operator) groups=1000(operator)
        assert.ok(res.output.includes('uid='));
        assert.ok(res.output.includes('(operator)'));
    });

    console.log(`\nResults: ${passed} Passed, ${failed} Failed`);
    if (failed > 0) process.exit(1);
}

runTests().catch(console.error);
