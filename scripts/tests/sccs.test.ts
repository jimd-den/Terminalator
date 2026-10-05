/**
 * SCCS tests: genuine s-files shared by admin, get, delta, prs, sact,
 * unget, rmdel, val, what and the sccs front end. Formats follow the
 * historical SCCS file layout (as written by AT&T SCCS and GNU CSSC).
 */
import { test, expectEqual, expectTrue, run } from './harness';
import { ShellFactory } from '../../src/domain/factories/ShellFactory';
import { createInitialTerminalState, TerminalState } from '../../src/domain/entities/TerminalState';
import { parseSFile } from '../../src/domain/commands/core/sccs/SFile';
import { extract, addDelta } from '../../src/domain/commands/core/sccs/SccsWeave';

function machine() {
    const shell = ShellFactory.createSystem();
    let state: TerminalState = createInitialTerminalState();
    const sh = async (line: string) => {
        const res = await shell.executor.executeWithSeparateStreams(line, state);
        state = { ...state, ...res.newState };
        return { out: res.output, err: res.stderr ?? '', status: res.exitCode };
    };
    return { sh };
}

const DATE = '[0-9]{2}/[0-9]{2}/[0-9]{2}';
const TIME = '[0-9]{2}:[0-9]{2}:[0-9]{2}';

test('admin -i writes a genuine, read-only s-file', async () => {
    const { sh } = machine();
    const r = await sh('printf "hello %%I%%\\nline2\\n" > f; admin -if s.f; echo $?; ls -l s.f | cut -c1-10');
    expectEqual(r.out, '0\n-r--r--r--\n');
    const raw = (await sh('cat s.f')).out;
    const lines = raw.split('\n');
    expectTrue(/^\x01h[0-9]{5}$/.test(lines[0]), `checksum line: ${JSON.stringify(lines[0])}`);
    expectEqual(lines[1], '\x01s 00002/00000/00000');
    expectTrue(new RegExp(`^\\x01d D 1\\.1 ${DATE} ${TIME} operator 1 0$`).test(lines[2]), `delta line: ${JSON.stringify(lines[2])}`);
    expectTrue(/^\x01c date and time created .* by operator$/.test(lines[3]), 'default comment');
    expectEqual(lines.slice(4).join('\n'), '\x01e\n\x01u\n\x01U\n\x01t\n\x01T\n\x01I 1\nhello %I%\nline2\n\x01E 1\n');
    const parsed = parseSFile(raw);
    expectTrue(parsed.ok && parsed.file.checksumOk, 'checksum verifies');
});

test('admin -i -> get -e -> edit -> delta -> get -r1.1 / prs round trip', async () => {
    const { sh } = machine();
    await sh('printf "hello %%I%%\\nline2\\n" > f; admin -if s.f; rm f');
    let r = await sh('get -e s.f');
    expectEqual(r.out, '1.1\nnew delta 1.2\n2 lines\n');
    expectEqual((await sh('ls -l f | cut -c1-10; cat f')).out, '-rw-r--r--\nhello %I%\nline2\n');
    expectTrue(new RegExp(`^1\\.1 1\\.2 operator ${DATE} ${TIME}\\n$`).test((await sh('cat p.f')).out), 'p-file entry');
    expectTrue(new RegExp(`^1\\.1 1\\.2 operator ${DATE} ${TIME}\\n$`).test((await sh('sact s.f')).out), 'sact');

    await sh('printf "hello %%I%%\\nchanged\\nline3\\n" > f');
    r = await sh('delta -yfirst s.f');
    expectEqual(r.out, '1.2\n2 inserted\n1 deleted\n1 unchanged\n');
    expectEqual((await sh('ls f p.f 2>/dev/null; echo $?')).out, '2\n');

    // The weave keeps both versions, closing blocks by serial.
    const body = (await sh('sed -n "/^\x01T/,\\$p" s.f')).out;
    expectEqual(body, '\x01T\n\x01I 1\nhello %I%\n\x01D 2\nline2\n\x01E 2\n\x01I 2\nchanged\nline3\n\x01E 2\n\x01E 1\n');

    expectEqual((await sh('get -p -r1.1 s.f')).out, 'hello 1.1\nline2\n');
    r = await sh('get -p s.f');
    expectEqual(r.out, 'hello 1.2\nchanged\nline3\n');
    expectEqual(r.err, '1.2\n3 lines\n');
    expectEqual((await sh('get -p -s -m -n s.f')).out, 'f\t1.1\thello 1.2\nf\t1.2\tchanged\nf\t1.2\tline3\n');

    r = await sh('prs s.f');
    expectTrue(new RegExp(`^s\\.f:\\n\\nD 1\\.2 ${DATE} ${TIME} operator 2 1\\t00002/00001/00001\\nMRs:\\nCOMMENTS:\\nfirst\\n\\nD 1\\.1 `).test(r.out), r.out);
    expectEqual((await sh('prs -d":I: :DS: :DP: :Li:/:Ld:/:Lu: :C:" -r1.2 s.f')).out, '1.2 2 1 00002/00001/00001 first\n\n');
    expectEqual((await sh('prs -e -d:I: s.f; prs -l -r1.1 -d:I: s.f')).out, '1.2\n1.1\n1.2\n1.1\n');
    expectEqual((await sh('val s.f; echo $?')).out, '0\n');
});

test('get writes a read-only g-file and refuses to clobber a writable one', async () => {
    const { sh } = machine();
    await sh('echo "x %I%" > f; admin -if s.f; rm f');
    expectEqual((await sh('get -s s.f; ls -l f | cut -c1-10')).out, '-r--r--r--\n');
    await sh('chmod u+w f');
    const r = await sh('get s.f');
    expectEqual(r.status, 1);
    expectTrue(/writable/.test(r.err), r.err);
    expectEqual((await sh('get -k -s -p s.f')).out, 'x %I%\n');
});

test('keyword expansion', async () => {
    const { sh } = machine();
    await sh('for k in I R L B S Y F Q Z W A M C; do printf "%s=%%%s%%\\n" $k $k; done > kw; admin -ikw -fqQVAL -ftTYP -fmMOD s.kw');
    expectEqual((await sh('get -p -s s.kw')).out,
        'I=1.1\nR=1\nL=1\nB=0\nS=0\nY=TYP\nF=s.kw\nQ=QVAL\nZ=@(#)\nW=@(#)MOD\t1.1\nA=@(#)TYP MOD 1.1@(#)\nM=MOD\nC=13\n');
    const dates = (await sh('printf "%%D% %%H% %%T% %%E% %%G% %%U% %%P%\\n" > d; admin -id s.d; get -p -s s.d')).out;
    expectTrue(new RegExp(`^${DATE} [0-9]{2}/[0-9]{2}/[0-9]{2} ${TIME} ${DATE} [0-9/]{8} ${TIME} /home/operator/s\\.d\\n$`).test(dates), dates);
    const noKw = await sh('echo plain > p; admin -ip s.p; get -p s.p');
    expectTrue(/No id keywords/.test(noKw.err) && noKw.status === 0, 'warning without keywords');
    expectEqual((await sh('admin -fi s.p; get -p s.p; echo $?')).out, '1\n');
});

test('branches, releases and unget', async () => {
    const { sh } = machine();
    await sh('printf "a\\nb\\nc\\n" > f; admin -if s.f 2>/dev/null; rm f');
    await sh('get -e -s s.f; echo d >> f; delta -s -yone s.f');
    expectEqual((await sh('get -e -r1.1 s.f')).out, '1.1\nnew delta 1.1.1.1\n3 lines\n');
    await sh('echo branch >> f; delta -s -ybr s.f');
    expectEqual((await sh('get -p -s -r1.1.1.1 s.f')).out, 'a\nb\nc\nbranch\n');
    expectEqual((await sh('get -p -s s.f')).out, 'a\nb\nc\nd\n');
    expectEqual((await sh('get -e -r2 s.f 2>/dev/null')).out, '1.2\nnew delta 2.1\n4 lines\n');
    expectEqual((await sh('unget s.f; ls f p.f 2>/dev/null; sact s.f')).out, '2.1\n');
    expectEqual((await sh('unget s.f; echo $?')).status, 0);
    expectTrue((await sh('unget s.f')).status === 1, 'nothing to unget');
});

test('rmdel removes the newest delta only', async () => {
    const { sh } = machine();
    await sh('echo "x %I%" > f; admin -if s.f; rm f; get -e -s s.f; echo y >> f; delta -s -yc s.f');
    expectEqual((await sh('rmdel -r1.1 s.f')).status, 1);
    expectEqual((await sh('rmdel -r1.2 s.f; echo $?; get -p -s s.f; prs -a -e -d":DT: :I:" s.f')).out, '0\nx 1.1\nR 1.2\nD 1.1\n');
    expectEqual((await sh('val s.f; echo $?')).out, '0\n');
});

test('val exit status bits', async () => {
    const { sh } = machine();
    await sh('admin -n -fmmod -fttyp s.f; echo junk > s.bad');
    const st = async (cmd: string) => (await sh(cmd)).status;
    expectEqual(await st('val s.f'), 0);
    expectEqual(await st('val'), 0x80);
    expectEqual(await st('val -z s.f'), 0x40);
    expectEqual(await st('val s.bad'), 0x20);
    expectEqual(await st('val missing'), 0x10);
    expectEqual(await st('val -r1.x s.f'), 0x08);
    expectEqual(await st('val -r1.9 s.f'), 0x04);
    expectEqual(await st('val -y other s.f'), 0x02);
    expectEqual(await st('val -m other s.f'), 0x01);
    expectEqual(await st('val -m other -y other s.f missing'), 0x13);
    expectEqual((await sh('val -s missing')).out, '');
    // A tampered body breaks the checksum.
    await sh('sed "s/typ/TYP/" s.f > s.t');
    expectEqual(await st('val s.t'), 0x20);
    expectEqual(await st('admin -h s.t'), 1);
    expectEqual(await st('cp s.t s.u; admin -z s.u; val s.u'), 0);
    expectEqual((await sh('printf "s.f\\ns.f -r9.9\\n" | val -')).status, 0x04);
});

test('what finds @(#) strings, including in binary files', async () => {
    const { sh } = machine();
    await sh('printf "\\177ELF\\000@(#)one 1.1\\000junk@(#)two\\"x\\n" > bin');
    expectEqual((await sh('what bin')).out, 'bin:\n\tone 1.1\n\ttwo\n');
    expectEqual((await sh('what -s bin')).out, 'bin:\n\tone 1.1\n');
    expectEqual((await sh('echo plain > p; what p; echo $?')).out, 'p:\n1\n');
    expectEqual((await sh('echo "x %W%" > f; admin -fmprog -if s.f; rm f; get -s s.f; what f')).out, 'f:\n\tprog\t1.1\n');
});

test('sccs front end', async () => {
    const { sh } = machine();
    await sh('echo "v %I%" > prog.c');
    expectEqual((await sh('sccs create prog.c; ls -a | grep prog')).out, '1.1\n1 lines\n,prog.c\nprog.c\n');
    expectEqual((await sh('ls SCCS')).out, 's.prog.c\n');
    expectEqual((await sh('sccs edit prog.c')).out, '1.1\nnew delta 1.2\n1 lines\n');
    expectEqual((await sh('sccs tell')).out, 'prog.c\n');
    expectTrue(/prog\.c: being edited: 1\.1 1\.2 operator/.test((await sh('sccs info')).out), 'info');
    expectEqual((await sh('sccs check')).status, 1);
    await sh('echo more >> prog.c');
    expectEqual((await sh('sccs diffs prog.c')).out, '\n------- prog.c -------\n1a2\n> more\n');
    expectEqual((await sh('sccs delget -yadded prog.c')).out, '1.2\n1 inserted\n0 deleted\n1 unchanged\n1.2\n2 lines\n');
    expectEqual((await sh('cat prog.c; sccs info; sccs check; echo $?')).out, 'v 1.2\nmore\nNothing being edited\n0\n');
    expectEqual((await sh('sccs clean; ls prog.c 2>/dev/null; sccs prt -d:C: prog.c')).out, 'added\n\n');
    expectEqual((await sh('mkdir -p /tmp/proj/SCCS; cp SCCS/s.prog.c /tmp/proj/SCCS/; PROJECTDIR=/tmp/proj sccs get -p -s prog.c')).out, 'v 1.2\nmore\n');
    expectEqual((await sh('sccs bogus')).status, 1);
});

test('weave: deltas on top of interleaved blocks', () => {
    let body = ['\x01I 1', 'a', 'b', 'c', '\x01E 1'];
    const v2 = addDelta(body, new Set([1]), ['a', 'B', 'c', 'd'], 2);
    body = v2.body;
    expectEqual([v2.inserted, v2.deleted, v2.unchanged], [2, 1, 2]);
    const v3 = addDelta(body, new Set([1, 2]), ['z', 'a', 'c'], 3);
    body = v3.body;
    expectEqual(extract(body, new Set([1])).lines, ['a', 'b', 'c']);
    expectEqual(extract(body, new Set([1, 2])).lines, ['a', 'B', 'c', 'd']);
    expectEqual(extract(body, new Set([1, 2, 3])).lines, ['z', 'a', 'c']);
    expectEqual(extract(body, new Set([1, 2, 3])).serials, [3, 1, 1]);
});

run('sccs');
