
import { strict as assert } from 'assert';
import { TimeCommand } from '../../../src/domain/commands/core/TimeCommand';
import { NohupCommand } from '../../../src/domain/commands/core/NohupCommand';
import { NiceCommand } from '../../../src/domain/commands/core/NiceCommand';
import { FileSystem } from '../../../src/domain/entities/FileSystem';
import { createInitialTerminalState } from '../../../src/domain/entities/TerminalState';
import { CommandRegistry } from '../../../src/domain/commands/CommandRegistry';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

async function runTests() {
    console.log('Running Misc Tests...\n');
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

    // Setup registry for these meta-commands to invoke others
    const registry = new CommandRegistry();
    // Register a mock command to call
    registry.register('echo', {
        execute: (args) => ({ output: args.join(' '), newState: state, exitCode: 0 })
    });

    const time = new TimeCommand(fs, (name) => registry.get(name));
    const nohup = new NohupCommand(fs, (name) => registry.get(name));
    const nice = new NiceCommand(fs, (name) => registry.get(name));

    // --- Time ---
    await runTest('time executes command and prints duration', async () => {
        const res = await time.execute(['echo', 'hello'], state);
        assert.equal(res.exitCode, 0);
        // Output should contain stdout of command + timing
        // "hello\nreal 0.00s..."
        assert.ok(res.output.includes('hello'));
        assert.ok(res.output.includes('real'));
    });

    // --- Nohup ---
    await runTest('nohup ignores hup and redirects output', async () => {
        // "nohup echo test" -> appends to nohup.out
        const res = await nohup.execute(['echo', 'test'], state);
        assert.equal(res.exitCode, 0);
        // "nohup: ignoring input..."
        // Output from echo should be in nohup.out
        const content = fs.readFile('/home/operator/nohup.out');
        assert.ok(content.includes('test'));
    });

    // --- Nice ---
    await runTest('nice executes command', async () => {
        const res = await nice.execute(['-n', '10', 'echo', 'nice'], state);
        assert.equal(res.output, 'nice');
    });

    console.log(`\nResults: ${passed} Passed, ${failed} Failed`);
    if (failed > 0) process.exit(1);
}

runTests().catch(console.error);
