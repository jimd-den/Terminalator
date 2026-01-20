
import { strict as assert } from 'assert';
import { GrepCommand } from '../../../../src/domain/commands/core/GrepCommand';
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
    console.log('Running GrepCommand Unit Tests...');
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
    // @ts-ignore - We will modify the constructor signature soon, so ignoring TS error for now or assuming we pass it
    // Actually, strictly speaking I should refactor the code first OR allow the test to fail compilation if I strictly follow TDD red-green-refactor.
    // But since I'm in a JS/TS environment where I can pass extra args to constructor without error if not typed yet?
    // No, TS will complain.
    // I will cast to any to instantiate with telemetry before I update the class,
    // OR I will update the class signature in the same step.
    // I will update the test to expect the new signature.

    // For TDD: I write the test expecting the new signature.
    const grep = new GrepCommand(fs, telemetry);
    const state = createInitialTerminalState();

    // Populate FS
    fs.writeFile('/test.txt', 'hello world\ngoodbye world\nfoo bar', 'w');
    fs.mkdir('/dir', 0o755);
    fs.writeFile('/dir/file1.txt', 'match inside', 'w');

    await runTest('GrepCommand: finds matches', () => {
        const res = grep.execute(['hello', '/test.txt'], state);
        assert.equal(res.exitCode, 0);
        assert.ok(res.output.includes('hello world'));
        assert.ok(!res.output.includes('goodbye'));
    });

    await runTest('GrepCommand: returns 1 on no match', () => {
        const res = grep.execute(['xyz', '/test.txt'], state);
        assert.equal(res.exitCode, 1);
        assert.equal(res.output, '');
    });

    await runTest('GrepCommand: handles -i (case insensitive)', () => {
        const res = grep.execute(['-i', 'HELLO', '/test.txt'], state);
        assert.equal(res.exitCode, 0);
        assert.ok(res.output.includes('hello world'));
    });

    await runTest('GrepCommand: handles -v (invert)', () => {
        const res = grep.execute(['-v', 'world', '/test.txt'], state);
        assert.equal(res.exitCode, 0);
        assert.ok(res.output.includes('foo bar'));
        assert.ok(!res.output.includes('hello'));
    });

    await runTest('GrepCommand: handles -c (count)', () => {
        const res = grep.execute(['-c', 'world', '/test.txt'], state);
        assert.equal(res.exitCode, 0);
        assert.ok(res.output.trim() === '2');
    });

    await runTest('GrepCommand: handles recursive -r', () => {
        const res = grep.execute(['-r', 'match', '/dir'], state);
        assert.equal(res.exitCode, 0);
        // Expect filename prefix in recursive mode
        assert.ok(res.output.includes('/dir/file1.txt:match inside'));
    });

    await runTest('GrepCommand: uses telemetry', () => {
        assert.ok(telemetry.traces.length > 0, 'Should have recorded traces');
        const trace = telemetry.traces.find(t => t.fnName === 'GrepCommand.execute');
        assert.ok(trace, 'Should have traced execute');
    });

    console.log(`\nResults: ${passed} Passed, ${failed} Failed`);
    if (failed > 0) process.exit(1);
}

runTests().catch(console.error);
