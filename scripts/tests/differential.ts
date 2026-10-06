/**
 * Differential testing against real POSIX tools.
 *
 * Each case is a shell script. Goldens are recorded by running it with dash
 * (and the host's GNU utilities) in an empty scratch directory; the test
 * then runs the same script in the simulator and compares stdout + status.
 *
 *   npx tsx scripts/tests/<suite>.test.ts           # compare against goldens
 *   npx tsx scripts/tests/<suite>.test.ts --update  # re-record goldens
 */
import * as fsNode from 'fs';
import * as os from 'os';
import * as path from 'path';
import { spawnSync } from 'child_process';
import { test, expectEqual, run } from './harness';
import { ShellFactory } from '../../src/domain/factories/ShellFactory';
import { createInitialTerminalState } from '../../src/domain/entities/TerminalState';
import { FileSystemService } from '../../src/domain/services/FileSystemService';

export interface DifferentialCase {
    name: string;
    script: string;
}

type Golden = Record<string, { stdout: string; status: number }>;

function runReference(script: string): { stdout: string; status: number } {
    const dir = fsNode.mkdtempSync(path.join(os.tmpdir(), 'posix-ref-'));
    try {
        const res = spawnSync('dash', ['-c', script, 'sh'], {
            cwd: dir,
            env: { PATH: '/usr/bin:/bin', HOME: dir, LC_ALL: 'C', TZ: 'UTC' } as unknown as NodeJS.ProcessEnv,
            encoding: 'latin1',
            timeout: 10000,
        });
        return { stdout: res.stdout, status: res.status ?? -1 };
    } finally {
        fsNode.rmSync(dir, { recursive: true, force: true });
    }
}

/** Extra installation steps for the simulated machine (e.g. locale data). */
export type SimulatorSetup = (fs: FileSystemService) => void;

async function runSimulator(script: string, setup?: SimulatorSetup): Promise<{ stdout: string; status: number }> {
    const { executor, fsService } = ShellFactory.create();
    setup?.(fsService);
    const work = '/home/operator/work';
    fsService.mkdirp(work, 0o755, 1000, 1000);
    const state = { ...createInitialTerminalState(), currentDirectory: work };
    state.environment = { ...state.environment, PWD: work, HOME: work, TZ: 'UTC', LC_ALL: 'C' };
    state.exportedVars = [...(state.exportedVars ?? []), 'TZ', 'LC_ALL'];
    const res = await executor.executeWithSeparateStreams(script, state);
    // Compare as bytes (latin1), like the reference capture.
    const stdout = Buffer.from(res.output, res.binary ? 'latin1' : 'utf8').toString('latin1');
    return { stdout, status: res.exitCode };
}

export function differentialSuite(title: string, cases: DifferentialCase[], goldenFile: string, setup?: SimulatorSetup) {
    if (process.argv.includes('--update')) {
        const golden: Golden = {};
        for (const c of cases) golden[c.name] = runReference(c.script);
        fsNode.mkdirSync(path.dirname(goldenFile), { recursive: true });
        fsNode.writeFileSync(goldenFile, JSON.stringify(golden, null, 2) + '\n');
        console.log(`Wrote ${cases.length} goldens to ${goldenFile}`);
        return;
    }
    const golden: Golden = fsNode.existsSync(goldenFile) ? JSON.parse(fsNode.readFileSync(goldenFile, 'utf8')) : {};
    for (const c of cases) {
        test(c.name, async () => {
            const expected = golden[c.name];
            if (!expected) throw new Error('no golden (run with --update)');
            expectEqual(await runSimulator(c.script, setup), expected, c.script.replace(/\n/g, '\\n'));
        });
    }
    run(title);
}
