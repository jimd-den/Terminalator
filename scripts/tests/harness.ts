/**
 * Minimal test harness (no external test framework is used in this repo).
 *
 *   test('name', async () => { expectEqual(actual, expected); });
 *   await run();   // prints results, exits non-zero on failure
 */

type TestFn = () => void | Promise<void>;
const tests: { name: string; fn: TestFn }[] = [];

export function test(name: string, fn: TestFn) {
    tests.push({ name, fn });
}

export class AssertionError extends Error { }

export function expectEqual<T>(actual: T, expected: T, label = '') {
    const a = JSON.stringify(actual);
    const e = JSON.stringify(expected);
    if (a !== e) throw new AssertionError(`${label ? label + ': ' : ''}expected ${e}\n        got      ${a}`);
}

export function expectTrue(cond: boolean, message: string) {
    if (!cond) throw new AssertionError(message);
}

export async function run(suiteName: string): Promise<{ passed: number; failed: number }> {
    let passed = 0;
    const failures: string[] = [];
    const filter = process.env.TEST_FILTER;
    for (const t of tests) {
        if (filter && !t.name.includes(filter)) continue;
        try {
            await t.fn();
            passed++;
        } catch (e: any) {
            failures.push(`  ✗ ${t.name}\n      ${e?.message ?? e}`);
        }
    }
    const failed = failures.length;
    console.log(`\n${suiteName}: ${passed} passed, ${failed} failed`);
    if (failed) console.log(failures.join('\n'));
    if (failed) process.exitCode = 1;
    return { passed, failed };
}
