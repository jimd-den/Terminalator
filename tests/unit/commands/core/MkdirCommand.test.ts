
import { strict as assert } from 'assert';
import { MkdirCommand } from '../../../../src/domain/commands/core/MkdirCommand';
import { FileSystem } from '../../../../src/domain/entities/FileSystem';
import { TelemetryPort } from '../../../../src/domain/ports/TelemetryPort';
import { createInitialTerminalState } from '../../../../src/domain/entities/TerminalState';

// Mock TelemetryPort
class MockTelemetry implements TelemetryPort {
    traces: any[] = [];

    trace<T>(fnName: string, fn: (...args: any[]) => T, ...args: any[]): T {
        this.traces.push({ fnName, args });
        return fn(...args);
    }
    info(message: string, context?: any): void {}
    warn(message: string, context?: any): void {}
    error(message: string, context?: any): void {}
    debug(message: string, context?: any): void {}
}

async function runTests() {
    console.log('Running MkdirCommand Unit Tests...');
    let passed = 0;
    let failed = 0;

    const runTest = async (name: string, fn: () => Promise<void> | void) => {
        try {
            await fn();
            console.log(`\x1b[32m[PASS]\x1b[0m ${name}`);
            passed++;
        } catch (e: any) {
            console.log(`\x1b[31m[FAIL]\x1b[0m ${name}`);
            console.error(e);
            failed++;
        }
    };

    // Setup
    const fs = new FileSystem();
    const telemetry = new MockTelemetry();
    const mkdir = new MkdirCommand(fs, telemetry);
    const state = createInitialTerminalState();

    await runTest('MkdirCommand: creates directory', () => {
        const res = mkdir.execute(['/newdir'], state);
        assert.equal(res.exitCode, 0);
        assert.ok(fs.resolveNode('/newdir'), 'Directory should exist');
        assert.ok(fs.isDirectory(fs.resolveNode('/newdir')!), 'Should be a directory');
    });

    await runTest('MkdirCommand: fails if exists', () => {
        const res = mkdir.execute(['/newdir'], state);
        assert.equal(res.exitCode, 1);
        assert.ok(res.output.includes('File exists'));
    });

    await runTest('MkdirCommand: fails if parent missing', () => {
        const res = mkdir.execute(['/missing/child'], state);
        assert.equal(res.exitCode, 1);
        assert.ok(res.output.includes('No such file'));
    });

    await runTest('MkdirCommand: -p creates parents', () => {
        const res = mkdir.execute(['-p', '/deep/nested/dir'], state);
        assert.equal(res.exitCode, 0);
        assert.ok(fs.resolveNode('/deep/nested/dir'), 'Deep directory should exist');
    });

    await runTest('MkdirCommand: -p no error if exists', () => {
        const res = mkdir.execute(['-p', '/newdir'], state);
        assert.equal(res.exitCode, 0);
    });

    await runTest('MkdirCommand: uses telemetry', () => {
        const trace = telemetry.traces.find(t => t.fnName === 'MkdirCommand.execute');
        assert.ok(trace, 'Should trace execution');
    });

    await runTest('MkdirCommand: handles -- separator', () => {
        // Should treat -p as filename, not flag (so -p arg is missing for mkdir)
        // Wait, if -p is after --, it is a directory named '-p'.
        // So `mkdir -- -p` creates a directory named `-p`.
        // We need to support this.

        // Let's test a directory starting with dash
        const res = mkdir.execute(['--', '-d'], state);
        // Expect success creating ./-d
        assert.equal(res.exitCode, 0);
        assert.ok(fs.resolveNode('/-d'), 'Directory named -d should exist');
    });

    console.log(`\nResults: ${passed} Passed, ${failed} Failed`);
    if (failed > 0) process.exit(1);
}

runTests().catch(console.error);
