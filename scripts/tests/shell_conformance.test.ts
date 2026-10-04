/**
 * Differential POSIX shell conformance test.
 *
 *   npx tsx scripts/tests/shell_conformance.test.ts           # compare against goldens
 *   npx tsx scripts/tests/shell_conformance.test.ts --update  # regenerate goldens with dash
 *
 * Goldens are the stdout and exit status of a real POSIX shell (dash) run in
 * an empty scratch directory, so every expectation is ground truth rather
 * than a hand-written guess.
 */
import * as fsNode from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFileSync, spawnSync } from 'child_process';
import { SHELL_CASES } from './shell_conformance.cases';
import { test, expectEqual, run } from './harness';
import { ShellFactory } from '../../src/domain/factories/ShellFactory';
import { createInitialTerminalState } from '../../src/domain/entities/TerminalState';

const GOLDEN = path.join(__dirname, 'golden', 'shell_conformance.json');

type Golden = Record<string, { stdout: string; status: number }>;

function runReference(script: string): { stdout: string; status: number } {
    const dir = fsNode.mkdtempSync(path.join(os.tmpdir(), 'posix-ref-'));
    try {
        const res = spawnSync('dash', ['-c', script, 'sh'], {
            cwd: dir,
            env: { PATH: '/usr/bin:/bin', HOME: dir, LC_ALL: 'C' } as unknown as NodeJS.ProcessEnv,
            encoding: 'utf8',
            timeout: 10000,
        });
        return { stdout: res.stdout, status: res.status ?? -1 };
    } finally {
        fsNode.rmSync(dir, { recursive: true, force: true });
    }
}

async function runSimulator(script: string): Promise<{ stdout: string; status: number }> {
    const { executor, fsService } = ShellFactory.create();
    const work = '/home/operator/work';
    fsService.mkdirp(work, 0o755, 1000, 1000);
    const state = { ...createInitialTerminalState(), currentDirectory: work };
    state.environment = { ...state.environment, PWD: work, HOME: work };
    const res = await executor.executeWithSeparateStreams(script, state);
    return { stdout: res.output, status: res.exitCode };
}

if (process.argv.includes('--update')) {
    execFileSync('dash', ['-c', 'true']);
    const golden: Golden = {};
    for (const c of SHELL_CASES) golden[c.name] = runReference(c.script);
    fsNode.mkdirSync(path.dirname(GOLDEN), { recursive: true });
    fsNode.writeFileSync(GOLDEN, JSON.stringify(golden, null, 2) + '\n');
    console.log(`Wrote ${Object.keys(golden).length} goldens to ${GOLDEN}`);
} else {
    const golden: Golden = JSON.parse(fsNode.readFileSync(GOLDEN, 'utf8'));
    for (const c of SHELL_CASES) {
        test(c.name, async () => {
            const expected = golden[c.name];
            if (!expected) throw new Error('no golden (run with --update)');
            const actual = await runSimulator(c.script);
            expectEqual(actual, expected, c.script.replace(/\n/g, '\\n'));
        });
    }
    run('POSIX shell conformance (vs dash)');
}
