
import { strict as assert } from 'assert';
import { AliasCommand } from '../../../src/domain/commands/core/AliasCommand';
import { UnaliasCommand } from '../../../src/domain/commands/core/UnaliasCommand';
import { TypeCommand } from '../../../src/domain/commands/core/TypeCommand';
import { FileSystem } from '../../../src/domain/entities/FileSystem';
import { createInitialTerminalState } from '../../../src/domain/entities/TerminalState';
import { CommandRegistry } from '../../../src/domain/commands/CommandRegistry';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

async function runTests() {
    console.log('Running ShellUtils Tests...\n');
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
    const registry = new CommandRegistry();
    // Register 'ls' to check type
    registry.register('ls', { execute: () => ({ output: '', newState: state, exitCode: 0 }) });

    const alias = new AliasCommand(fs);
    const unalias = new UnaliasCommand(fs);
    const typeCmd = new TypeCommand(fs, registry); // Needs registry access

    // --- Alias ---
    await runTest('alias sets alias', async () => {
        const res = await alias.execute(['ll=ls -l'], state);
        assert.equal(res.exitCode, 0);
        assert.equal(res.newState.aliases['ll'], 'ls -l');
    });

    await runTest('alias prints aliases', async () => {
        const res = await alias.execute([], state); // Should print all
        assert.ok(res.output.includes('ll=ls -l'));
    });

    // --- Unalias ---
    await runTest('unalias removes alias', async () => {
        const res = await unalias.execute(['ll'], state);
        assert.equal(res.exitCode, 0);
        assert.equal(res.newState.aliases['ll'], undefined);
    });

    // --- Type ---
    await runTest('type identifies alias', async () => {
        // Setup alias
        state.aliases['foo'] = 'bar';
        const res = await typeCmd.execute(['foo'], state);
        assert.ok(res.output.includes('is an alias'));
    });

    await runTest('type identifies builtin/command', async () => {
        const res = await typeCmd.execute(['ls'], state);
        assert.ok(res.output.includes('is a command') || res.output.includes('is /bin/ls'));
    });

    console.log(`\nResults: ${passed} Passed, ${failed} Failed`);
    if (failed > 0) process.exit(1);
}

runTests().catch(console.error);
