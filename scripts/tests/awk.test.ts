/**
 * awk behaviour that the differential suite cannot check against the host's
 * mawk: POSIX/gawk semantics where mawk differs, diagnostics, and I/O with
 * the simulated system.
 */
import { test, expectEqual, run } from './harness';
import { ShellFactory } from '../../src/domain/factories/ShellFactory';
import { createInitialTerminalState, TerminalState } from '../../src/domain/entities/TerminalState';

async function sh(line: string) {
    const shell = ShellFactory.createSystem();
    const state: TerminalState = createInitialTerminalState();
    const res = await shell.executor.executeWithSeparateStreams(line, state);
    return { out: res.output, err: res.stderr ?? '', status: res.exitCode };
}

test('-Ft means a tab', async () => {
    expectEqual((await sh(`printf 'a\\tb c\\n' | awk -Ft '{print $2}'`)).out, 'b c\n');
});

test('fields beyond NF are uninitialized (numeric 0 and "")', async () => {
    expectEqual((await sh(`echo 'a b' | awk '{print ($5 == 0), ($5 == ""), NF}'`)).out, '1 1 2\n');
});

test('paragraph mode: newline always separates fields', async () => {
    expectEqual((await sh(`printf 'a:b\\nc\\n' | awk 'BEGIN {RS = ""; FS = ":"} {print NF, $3}'`)).out, '3 c\n');
});

test('substr clips positions before 1 (POSIX)', async () => {
    expectEqual((await sh(`awk 'BEGIN {print substr("hello", 0, 2) "|" substr("hello", -1, 3)}'`)).out, 'h|h\n');
});

test('srand makes rand repeatable', async () => {
    expectEqual((await sh(`awk 'BEGIN {srand(42); a = rand(); srand(42); print (a == rand())}'`)).out, '1\n');
});

test('cmd | getline updates NR', async () => {
    expectEqual((await sh(`awk 'BEGIN {"echo hi" | getline; print $0, NR}'`)).out, 'hi 1\n');
});

test('division by zero is fatal', async () => {
    const r = await sh(`awk 'BEGIN {print 1/0}'`);
    expectEqual([r.out, r.status, /division by zero/.test(r.err)], ['', 2, true]);
});

test('syntax errors: diagnostic on stderr, status 2', async () => {
    const r = await sh(`awk 'BEGIN { print ( }'`);
    expectEqual([r.out, r.status, r.err.startsWith('awk: syntax error')], ['', 2, true]);
});

test('missing input file: diagnostic, status 2', async () => {
    const r = await sh(`awk '{print}' /nonexistent`);
    expectEqual([r.status, r.err], [2, 'awk: cannot open /nonexistent (No such file or directory)\n']);
});

test('usage errors', async () => {
    expectEqual((await sh('awk')).status, 2);
    expectEqual((await sh(`awk -q '{}'`)).status, 2);
    expectEqual((await sh(`awk -v 1x=2 'BEGIN{}'`)).status, 2);
});

test('output order with system() and pipes', async () => {
    expectEqual((await sh(`awk 'BEGIN {print "a"; system("echo b"); print "c"; print "e" | "cat"; close("cat"); print "f"}'`)).out, 'a\nb\nc\ne\nf\n');
});

test('print to /dev/stderr and files in the simulated file system', async () => {
    const r = await sh(`cd /tmp && awk 'BEGIN {print "x" > "/dev/stderr"; print "y" > "out.txt"}' && cat /tmp/out.txt`);
    expectEqual([r.out, r.err], ['y\n', 'x\n']);
});

test('function parameters: arrays by reference, untyped arguments become arrays', async () => {
    expectEqual((await sh(`awk 'function f(a) {a["k"] = 1} function g(b) {f(b)} BEGIN {g(z); print length(z), z["k"]}'`)).out, '1 1\n');
});

test('-v escapes and strnum', async () => {
    expectEqual((await sh(`awk -v 's=a\\nb' -v n=010 'BEGIN {print s; print (n == 10)}'`)).out, 'a\nb\n1\n');
});

test('printf %c and %d of large values', async () => {
    expectEqual((await sh(`awk 'BEGIN {printf "%c%c|%d\\n", 72, "i!", 2^53}'`)).out, 'Hi|9007199254740992\n');
});

run('awk');
