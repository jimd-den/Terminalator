/**
 * Dev REPL probe: runs each CLI argument as a shell line against a fresh simulated system.
 * Usage: npx tsx scripts/dev/sh.ts 'echo hi' 'ls /'
 */
import { ShellFactory } from '../../src/domain/factories/ShellFactory';
import { createInitialTerminalState } from '../../src/domain/entities/TerminalState';

(async () => {
    const { executor } = process.env.BARE ? ShellFactory.create() : ShellFactory.createSystem();
    let state = createInitialTerminalState();
    for (const line of process.argv.slice(2)) {
        const res = await executor.execute(line, state);
        state = { ...state, ...res.newState };
        process.stdout.write(`$ ${line}\n${JSON.stringify(res.output)} [exit ${res.exitCode}]\n`);
    }
})();
