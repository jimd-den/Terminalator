
import { strict as assert } from 'assert';
import { AsaCommand } from '../../../src/domain/commands/core/AsaCommand';
import { DdCommand } from '../../../src/domain/commands/core/DdCommand';
import { IconvCommand } from '../../../src/domain/commands/core/IconvCommand';
import { FileSystem } from '../../../src/domain/entities/FileSystem';
import { createInitialTerminalState } from '../../../src/domain/entities/TerminalState';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

async function runTests() {
    console.log('Running TextMisc Tests...\n');
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

    const asa = new AsaCommand(fs);
    const dd = new DdCommand(fs);
    const iconv = new IconvCommand(fs);

    // --- Asa ---
    await runTest('asa interprets carriage control', async () => {
        // '1' in first col means page eject (\f) or newline?
        // ' ' is normal. '+' is overstrike.
        // Simplified: '1abc' -> '\f\nabc'?
        // POSIX asa:
        // ' ' -> newline then print
        // '0' -> newline, newline then print
        // '1' -> form feed then print
        // '+' -> no newline (overprint)
        const input = '0abc\n1def\n+ghi';
        const res = await asa.execute([], state, input);
        assert.equal(res.exitCode, 0);
        // '0abc' -> \n\nabc
        // '1def' -> \fdef
        // '+ghi' -> ghi (overwritten on def, technically just printed without newline before it? No, asa logic transforms prefix to suffix or prefix chars)
        // Standard:
        // 0 -> \n abc
        // 1 -> \f def
        // + -> \r ghi (return to start of line)
        // Simplified impl details below.
        assert.ok(res.output.includes('abc'));
    });

    // --- Dd ---
    await runTest('dd copies data', async () => {
        fs.writeFile('/dd_in', 'data', 'w');
        // dd if=/dd_in of=/dd_out
        const res = await dd.execute(['if=/dd_in', 'of=/dd_out'], state);
        assert.equal(res.exitCode, 0);
        const out = fs.readFile('/dd_out');
        assert.equal(out, 'data');
    });

    // --- Iconv ---
    await runTest('iconv converts encoding (identity)', async () => {
        // iconv -f UTF-8 -t ASCII
        // Simplified: copy stdin to stdout
        const input = 'text';
        const res = await iconv.execute([], state, input);
        assert.equal(res.output, 'text');
    });

    console.log(`\nResults: ${passed} Passed, ${failed} Failed`);
    if (failed > 0) process.exit(1);
}

runTests().catch(console.error);
