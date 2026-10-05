/**
 * Archive and compression utilities: tar, pax, cpio, gzip/gunzip/zcat, ar.
 *
 * Golden archives below were produced on a GNU/Linux host (GNU tar 1.35
 * --format=ustar --sort=name, GNU cpio 2.13, gzip 1.12, GNU ar 2.42) from
 *   g/ a.txt link->a.txt sub/ sub/b.bin (bytes 0..255, mode 600)
 *   sub/<60 x>/<60 y>.txt   (a path that needs the ustar prefix field)
 * all owned by root with mtime 2024-01-02 03:04:05 UTC. The sim must list
 * and extract them, and re-create the tar and ar archives byte for byte.
 * Node's zlib stands in for host gzip to check the sim's DEFLATE output.
 */
process.env.TZ = 'UTC';
import { gunzipSync, inflateRawSync } from 'zlib';
import { test, expectEqual, expectTrue, run } from './harness';
import { ShellFactory } from '../../src/domain/factories/ShellFactory';
import { createInitialTerminalState, TerminalState } from '../../src/domain/entities/TerminalState';
import { deflateRaw, inflateRaw } from '../../src/domain/utils/Deflate';
import { crc32 } from '../../src/domain/utils/Crc32';
import { gzipEncode, gzipDecode } from '../../src/domain/utils/Gzip';

const ROOT = { uid: 0, gid: 0, groups: [0] };

const GOLDEN = {
    'g.tgz':
        'H4sIAAAAAAAAA0vXZ6A5MAACc1NTMA0E6DSYbWhiamJiZm5mYgJUZ2hgYGbKoGBKe6cxMJQWlyQWAZ1SlJ9fgk8dIfkhCtL1E/VKKmjrM1AEAy' +
        'MWT/ybocW/oYGJEYOCAU1dBQUjPP4TcwoyErkG2hWjYKBAun5OZl42be0Al//m5iSU/4bmRsYMCka0L5pGfP5P1y8uTaJxG4CM+t/M1Gy0/qcH' +
        'gMR/kl5SZh7N7ADX8JjxDo9/E8z8b2pqPFr/0wUwMjGzsLKxc3BycfPw8vELCAoJi4iKiUtISknLyMrJKygqKauoqqlraGpp6+jq6RsYGhmbmJ' +
        'qZW1haWdvY2tk7ODo5u7i6uXt4enn7+Pr5BwQGBYeEhoVHREZFx8TGxSckJiWnpKalZ2RmZefk5uUXFBYVl5SWlVdUVlXX1NbVNzQ2Nbe0trV3' +
        'dHZ19/T29U+YOGnylKnTps+YOWv2nLnz5i9YuGjxkqXLlq9YuWr1mrXr1m/YuGnzlq3btu/YuWv3nr379h84eOjwkaPHjp84eer0mbPnzl+4eO' +
        'nylavXrt+4eev2nbv37j94+Ojxk6fPnr94+er1m7fv3n/4+Onzl6/fvv/4+ev3n7///g908A80gOT/CgoA4cqD5PLfyMzcfLT/RxdQSQEgtnVG' +
        'uP9nihr/wAIG1P8f0uU/5RmLMn8RCVJSUwtGu3+jYBSMglEwCkbBKBgFo2AUjIJRMApGwSgYBaNgFIyCUTD8AABtzsnyACgAAA==',
    'g.newc':
        'MDcwNzAxMDAxRDgxNjkwMDAwNDFFRDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMzY1OTM3RDI1MDAwMDAwMDAwMDAwMDBGRTAwMDAwMDAwMDAwMD' +
        'AwMDAwMDAwMDAwMDAwMDAwMDAyMDAwMDAwMDBnADA3MDcwMTAwMUQ4MUVEMDAwMDgxQTQwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDE2NTkzN0Qy' +
        'NTAwMDAwMDA2MDAwMDAwRkUwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwODAwMDAwMDAwZy9hLnR4dAAAAGFscGhhCgAAMDcwNzAxMD' +
        'AxRDgyMTEwMDAwQTFGRjAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMTY1OTM3RDI1MDAwMDAwMDUwMDAwMDBGRTAwMDAwMDAwMDAwMDAwMDAwMDAw' +
        'MDAwMDAwMDAwMDA3MDAwMDAwMDBnL2xpbmsAAAAAYS50eHQAAAAwNzA3MDEwMDFEODE3NTAwMDA0MUVEMDAwMDAwMDAwMDAwMDAwMDAwMDAwMD' +
        'AzNjU5MzdEMjUwMDAwMDAwMDAwMDAwMEZFMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDYwMDAwMDAwMGcvc3ViADA3MDcwMTAwMUQ4' +
        'MUYzMDAwMDgxODAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDE2NTkzN0QyNTAwMDAwMTAwMDAwMDAwRkUwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMD' +
        'AwMDAwMDAwQzAwMDAwMDAwZy9zdWIvYi5iaW4AAAAAAQIDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHyAhIiMkJSYnKCkqKywtLi8wMTIz' +
        'NDU2Nzg5Ojs8PT4/QEFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaW1xdXl9gYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXp7fH1+f4CBgoOEhY' +
        'aHiImKi4yNjo+QkZKTlJWWl5iZmpucnZ6foKGio6SlpqeoqaqrrK2ur7CxsrO0tba3uLm6u7y9vr/AwcLDxMXGx8jJysvMzc7P0NHS09TV1tfY' +
        '2drb3N3e3+Dh4uPk5ebn6Onq6+zt7u/w8fLz9PX29/j5+vv8/f7/MDcwNzAxMDAxRDgxRDQwMDAwNDFFRDAwMDAwMDAwMDAwMDAwMDAwMDAwMD' +
        'AwMjY1OTM3RDI1MDAwMDAwMDAwMDAwMDBGRTAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDQzMDAwMDAwMDBnL3N1Yi94eHh4eHh4eHh4' +
        'eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHgAAAAAMDcwNzAxMDAxRDgyMDIwMDAwODFBNDAwMDAwMD' +
        'AwMDAwMDAwMDAwMDAwMDAwMTY1OTM3RDI1MDAwMDAwMDUwMDAwMDBGRTAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDg0MDAwMDAwMDBn' +
        'L3N1Yi94eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHgveXl5eXl5eXl5eXl5eXl5eX' +
        'l5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5LnR4dAAAAGRlZXAKAAAAMDcwNzAxMDAwMDAwMDAwMDAwMDAwMDAw' +
        'MDAwMDAwMDAwMDAwMDAwMDAwMDAwMTAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDBCMDAwMD' +
        'AwMDBUUkFJTEVSISEhAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
        'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    'g.odc':
        'MDcwNzA3MTc3MDAwMzAwNTUxMDQwNzU1MDAwMDAwMDAwMDAwMDAwMDAzMDAwMDAwMTQ1NDQ2NzY0NDUwMDAwMDIwMDAwMDAwMDAwMGcAMDcwNz' +
        'A3MTc3MDAwMzAwNzU1MTAwNjQ0MDAwMDAwMDAwMDAwMDAwMDAxMDAwMDAwMTQ1NDQ2NzY0NDUwMDAwMTAwMDAwMDAwMDAwNmcvYS50eHQAYWxw' +
        'aGEKMDcwNzA3MTc3MDAwMzAxMDIxMTIwNzc3MDAwMDAwMDAwMDAwMDAwMDAxMDAwMDAwMTQ1NDQ2NzY0NDUwMDAwMDcwMDAwMDAwMDAwNWcvbG' +
        'luawBhLnR4dDA3MDcwNzE3NzAwMDMwMDU2NTA0MDc1NTAwMDAwMDAwMDAwMDAwMDAwMzAwMDAwMDE0NTQ0Njc2NDQ1MDAwMDA2MDAwMDAwMDAw' +
        'MDBnL3N1YgAwNzA3MDcxNzcwMDAzMDA3NjMxMDA2MDAwMDAwMDAwMDAwMDAwMDAwMDEwMDAwMDAxNDU0NDY3NjQ0NTAwMDAxNDAwMDAwMDAwND' +
        'AwZy9zdWIvYi5iaW4AAAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8gISIjJCUmJygpKissLS4vMDEyMzQ1Njc4OTo7PD0+P0BBQkNE' +
        'RUZHSElKS0xNTk9QUVJTVFVWV1hZWltcXV5fYGFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6e3x9fn+AgYKDhIWGh4iJiouMjY6PkJGSk5SVlp' +
        'eYmZqbnJ2en6ChoqOkpaanqKmqq6ytrq+wsbKztLW2t7i5uru8vb6/wMHCw8TFxsfIycrLzM3Oz9DR0tPU1dbX2Nna29zd3t/g4eLj5OXm5+jp' +
        '6uvs7e7v8PHy8/T19vf4+fr7/P3+/zA3MDcwNzE3NzAwMDMwMDcyNDA0MDc1NTAwMDAwMDAwMDAwMDAwMDAwMjAwMDAwMDE0NTQ0Njc2NDQ1MD' +
        'AwMTAzMDAwMDAwMDAwMDBnL3N1Yi94eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHgA' +
        'MDcwNzA3MTc3MDAwMzAxMDAyMTAwNjQ0MDAwMDAwMDAwMDAwMDAwMDAxMDAwMDAwMTQ1NDQ2NzY0NDUwMDAyMDQwMDAwMDAwMDAwNWcvc3ViL3' +
        'h4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eC95eXl5eXl5eXl5eXl5eXl5eXl5eXl5' +
        'eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXkudHh0AGRlZXAKMDcwNzA3MDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMD' +
        'AwMDAwMDAxMDAwMDAwMDAwMDAwMDAwMDAwMDAwMTMwMDAwMDAwMDAwMFRSQUlMRVIhISEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
        'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
        'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
        'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
        'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
        'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    'text.gz':
        'H4sICCV9k2UCA3RleHQAK8lIVSgszUzOVkgqyi/PU0jLr1DIKs0tKFbIL0stUigBSuckVlUqpOSnc5WMqh00agHk4DnbuAEAAA==',
    'lib.a':
        'ITxhcmNoPgovLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAyNiAgICAgICAgYAphdmVyeXZlcnl2ZXJ5bG' +
        '9uZ25hbWUuby8KCmEudHh0LyAgICAgICAgICAwICAgICAgICAgICAwICAgICAwICAgICA2NDQgICAgIDYgICAgICAgICBgCmFscGhhCi8wICAg' +
        'ICAgICAgICAgICAwICAgICAgICAgICAwICAgICAwICAgICA2NDQgICAgIDMgICAgICAgICBgCnl5Cgo=',
};

const bytes = (name: keyof typeof GOLDEN) => new Uint8Array(Buffer.from(GOLDEN[name], 'base64'));

const LONG = 'g/sub/' + 'x'.repeat(60);
const TAR_LIST = [
    'drwxr-xr-x root/root         0 2024-01-02 03:04 g/',
    '-rw-r--r-- root/root         6 2024-01-02 03:04 g/a.txt',
    'lrwxrwxrwx root/root         0 2024-01-02 03:04 g/link -> a.txt',
    'drwxr-xr-x root/root         0 2024-01-02 03:04 g/sub/',
    '-rw------- root/root       256 2024-01-02 03:04 g/sub/b.bin',
    `drwxr-xr-x root/root         0 2024-01-02 03:04 ${LONG}/`,
    `-rw-r--r-- root/root         5 2024-01-02 03:04 ${LONG}/${'y'.repeat(60)}.txt`,
].join('\n') + '\n';
const CPIO_LIST = [
    'drwxr-xr-x   3 root     root            0 Jan  2  2024 g',
    '-rw-r--r--   1 root     root            6 Jan  2  2024 g/a.txt',
    'lrwxrwxrwx   1 root     root            5 Jan  2  2024 g/link -> a.txt',
    'drwxr-xr-x   3 root     root            0 Jan  2  2024 g/sub',
    '-rw-------   1 root     root          256 Jan  2  2024 g/sub/b.bin',
    `drwxr-xr-x   2 root     root            0 Jan  2  2024 ${LONG}`,
    `-rw-r--r--   1 root     root            5 Jan  2  2024 ${LONG}/${'y'.repeat(60)}.txt`,
].join('\n') + '\n';

function machine() {
    const shell = ShellFactory.createSystem();
    let state: TerminalState = createInitialTerminalState();
    const sh = async (line: string, as?: typeof ROOT) => {
        const res = await shell.executor.executeWithSeparateStreams(line, as ? { ...state, user: as } : state);
        if (!as) state = { ...state, ...res.newState };
        return { out: res.output, err: res.stderr ?? '', status: res.exitCode };
    };
    const put = (path: string, data: Uint8Array, uid = 1000) => shell.fsService.writeFile(path, data, 'w', uid, uid, '/');
    const get = (path: string) => shell.fsService.readFileBuffer(path, '/');
    /** Sets a file's modification time (seconds since the epoch). */
    const age = (path: string, seconds: number) => {
        const node = shell.fsService.resolve(path, '/', false)!;
        shell.fsService.getInode(node.inodeId)!.mtime = seconds * 1000;
    };
    return { sh, put, get, age };
}

function same(a: Uint8Array, b: Uint8Array, label: string) {
    const diff = a.findIndex((v, i) => v !== b[i]);
    expectTrue(a.length === b.length && diff < 0, `${label}: ${a.length} vs ${b.length} bytes, first difference at ${diff}`);
}

// ---------------------------------------------------------------- codecs

test('crc32 check value', () => {
    expectEqual(crc32(new TextEncoder().encode('123456789')).toString(16), 'cbf43926');
});

test('deflate output is valid DEFLATE at every level (checked with zlib)', () => {
    let seed = 7;
    const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff);
    const inputs = [
        new Uint8Array(0),
        new TextEncoder().encode('abcabcabcabc hello hello hello\n'.repeat(500)),
        Uint8Array.from({ length: 70000 }, () => rnd() & 0xff),
        Uint8Array.from({ length: 100000 }, () => { let x = rnd(), k = 0; while (x & 1 && k < 30) { k++; x >>= 1; } return k * 3; }),
    ];
    for (const data of inputs) for (const level of [1, 6, 9]) {
        const packed = deflateRaw(data, level);
        same(new Uint8Array(inflateRawSync(packed)), data, `zlib level ${level}`);
        same(inflateRaw(packed).data, data, `own inflate level ${level}`);
    }
});

test('gzip members decode with zlib and host gzip output decodes in the sim', () => {
    const text = new TextEncoder().encode('the quick brown fox jumps over the lazy dog\n'.repeat(10));
    const gz = gzipEncode(text, { level: 9, name: 'text', mtime: 1704164645 });
    same(new Uint8Array(gunzipSync(gz)), text, 'zlib gunzip');
    expectEqual(Array.from(gz.subarray(0, 10)), [0x1f, 0x8b, 8, 8, 0x25, 0x7d, 0x93, 0x65, 2, 3]);
    same(gzipDecode(bytes('text.gz')).data, text, 'host gzip -9');
});

// ---------------------------------------------------------------- tar

test('tar lists a GNU tar ustar archive like GNU tar', async () => {
    const m = machine();
    m.put('/tmp/g.tgz', bytes('g.tgz'));
    expectEqual((await m.sh('tar -tvzf /tmp/g.tgz')).out, TAR_LIST);
    expectEqual((await m.sh('tar -tf /tmp/g.tgz g/a.txt nope')), {
        out: 'g/a.txt\n', err: 'tar: nope: Not found in archive\ntar: Exiting with failure status due to previous errors\n', status: 2,
    });
});

test('tar re-creates the GNU tar archive byte for byte', async () => {
    const m = machine();
    m.put('/tmp/g.tgz', bytes('g.tgz'));
    const r = await m.sh('mkdir /tmp/x && cd /tmp/x && tar -xzf /tmp/g.tgz && tar --format=ustar -cf /tmp/re.tar g', ROOT);
    expectEqual(r.err + r.status, '0');
    expectEqual((await m.sh('cd /tmp/x && ls -l g/sub/b.bin g/link | cut -c1-10')).out, 'lrwxrwxrwx\n-rw-------\n');
    same(m.get('/tmp/re.tar'), new Uint8Array(gunzipSync(bytes('g.tgz'))), 'ustar bytes');
});

test('tar round trip keeps modes, links, FIFOs and times', async () => {
    const { sh, age } = machine();
    await sh('mkdir -p d/e; echo hi > d/f; ln d/f d/h; ln -s f d/s; mkfifo d/p; chmod 750 d/e');
    age('/home/operator/d/f', 1588748889);
    expectEqual((await sh('tar -cvf a.tar d')).out, 'd/\nd/e/\nd/f\nd/h\nd/p\nd/s\n');
    expectEqual((await sh('tar -tvf a.tar d/h')).out, 'hrw-r--r-- operator/operator 0 2020-05-06 07:08 d/h link to d/f\n');
    await sh('mkdir out; tar -xf a.tar -C out');
    expectEqual((await sh(`cd out/d; ls -l | sed 1d | cut -c1-12; readlink s; cat h; ls -l f | grep -c 'May  6  2020 f'`)).out,
        'drwxr-x--- 2\n-rw-r--r-- 2\n-rw-r--r-- 2\nprw-r--r-- 1\nlrwxrwxrwx 1\nf\nhi\n1\n');
    expectEqual((await sh('cd; tar -xOf a.tar d/f')).out, 'hi\n');
    expectEqual((await sh('cd out; tar -xkf ../a.tar d/f')).status, 2);
});

test('tar -r, -u, -z, -C and diagnostics', async () => {
    const { sh, age } = machine();
    await sh('echo one > a; echo two > b');
    age('/home/operator/a', 1000000000);
    age('/home/operator/b', 1000000000);
    await sh('tar -cf t.tar a');
    await sh('tar -rf t.tar b; tar -uf t.tar a b');
    expectEqual((await sh('tar -tf t.tar')).out, 'a\nb\n');
    age('/home/operator/a', 1900000000);
    await sh('tar -uf t.tar a b');
    expectEqual((await sh('tar -tf t.tar')).out, 'a\nb\na\n');
    expectEqual((await sh('tar -czf t.tgz -C / etc/hostname && gzip -t t.tgz && tar -tf t.tgz')).out, 'etc/hostname\n');
    expectEqual(await sh('tar -tf missing.tar'), {
        out: '', err: 'tar: missing.tar: Cannot open: No such file or directory\ntar: Error is not recoverable: exiting now\n', status: 2,
    });
    expectEqual((await sh('tar -cf x.tar /etc/hostname nope')).err,
        "tar: Removing leading `/' from member names\ntar: nope: Cannot stat: No such file or directory\ntar: Exiting with failure status due to previous errors\n");
    expectEqual((await sh('tar -cf self.tar .')).err, 'tar: ./self.tar: file is the archive; not dumped\n');
    expectEqual((await sh('tar cf - a | tar tvf -')).status, 0);
});

// ---------------------------------------------------------------- cpio

test('cpio lists and extracts GNU cpio newc and odc archives', async () => {
    const m = machine();
    m.put('/tmp/g.newc', bytes('g.newc'));
    m.put('/tmp/g.odc', bytes('g.odc'));
    expectEqual(await m.sh('cpio -itv < /tmp/g.newc'), { out: CPIO_LIST, err: '3 blocks\n', status: 0 });
    expectEqual((await m.sh('cpio -it < /tmp/g.odc')).out, CPIO_LIST.replace(/^.* (?=g)/gm, '').replace(/ -> a.txt/, ''));
    m.put('/tmp/b', Uint8Array.from({ length: 256 }, (_, i) => i));
    expectEqual((await m.sh('mkdir /tmp/c && cd /tmp/c && cpio -idm < /tmp/g.newc 2>/dev/null && cmp g/sub/b.bin /tmp/b && readlink g/link && ls -l g/sub/b.bin', ROOT)).out,
        'a.txt\n-rw------- 1 root root 256 Jan  2  2024 g/sub/b.bin\n');
});

test('cpio -o formats round trip through -i and pass mode', async () => {
    const { sh } = machine();
    await sh('mkdir -p src/d; echo hi > src/d/f; echo top > src/t; ln src/t src/t2');
    for (const fmt of ['bin', 'odc', 'newc', 'crc', 'ustar']) {
        const r = await sh(`cd src && find . | cpio -o -H ${fmt} > ../${fmt}.cpio; cd ..; rm -rf x; mkdir x; cd x && cpio -id < ../${fmt}.cpio 2>/dev/null; cat d/f t2; ls -l t | cut -c11-12; cd ..`);
        expectEqual(r.out, 'hi\ntop\n 2\n');
    }
    expectEqual((await sh('(cd src && find . | cpio -pdv ../dest 2>&1); cat dest/d/f')).out, '../dest/./d\n../dest/./d/f\n../dest/./t\n../dest/./t2\n1 block\nhi\n');
    expectEqual((await sh('cd x && cpio -i < ../newc.cpio')).err,
        'cpio: ./d/f not created: newer or same age version exists\ncpio: ./t2 not created: newer or same age version exists\ncpio: ./t not created: newer or same age version exists\n2 blocks\n');
    expectEqual(await sh('echo junk | cpio -i'), { out: '', err: 'cpio: premature end of archive\n', status: 2 });
});

// ---------------------------------------------------------------- pax

test('pax list, -s, patterns, read and copy', async () => {
    const m = machine();
    m.put('/tmp/g.tgz', bytes('g.tgz'));
    await m.sh('gzip -dc /tmp/g.tgz > g.tar');
    expectEqual((await m.sh("pax -f g.tar 'g/s*'")).out, `g/sub\ng/sub/b.bin\n${LONG}\n${LONG}/${'y'.repeat(60)}.txt\n`);
    expectEqual((await m.sh('pax -v -f g.tar g/a.txt')).out, '-rw-r--r--  1 root     root             6 Jan  2  2024 g/a.txt\n');
    expectEqual((await m.sh("pax -f g.tar -s ',^g/a,A,' -d g/a.txt")).out, 'A.txt\n');
    expectEqual(await m.sh('pax -f g.tar zz'), { out: '', err: 'pax: WARNING! These patterns were not matched:\nzz\n', status: 1 });
    expectEqual((await m.sh('mkdir r && cd r && pax -r -f ../g.tar && cat g/a.txt && cd .. && mkdir c && pax -rw r/g/a.txt c && cat c/r/g/a.txt')).out, 'alpha\nalpha\n');
    expectEqual((await m.sh('pax -w -x cpio r/g/a.txt | pax -v')).out.replace(/ \w{3} [ \d]\d [ \d]\d[:\d]\d{2} /, ' DATE '), '-rw-r--r--  1 operator operator         6 DATE r/g/a.txt\n');
});

// ---------------------------------------------------------------- gzip

test('gzip, gunzip and zcat', async () => {
    const m = machine();
    m.put('/home/operator/text.gz', bytes('text.gz'));
    const text = 'the quick brown fox jumps over the lazy dog\n'.repeat(10);
    expectEqual((await m.sh('gzip -l text.gz')).out,
        '         compressed        uncompressed  ratio uncompressed_name\n                 73                 440  88.6% text\n');
    expectEqual((await m.sh('zcat text.gz')).out, text);
    expectEqual(await m.sh('gunzip -v text.gz'), { out: '', err: 'text.gz:\t 88.6% -- replaced with text\n', status: 0 });
    expectEqual((await m.sh('chmod 640 text; gzip -9 text; ls -l text.gz | cut -c1-10; ls text')).out, '-rw-r-----\n');
    same(new Uint8Array(gunzipSync(m.get('/home/operator/text.gz'))), new TextEncoder().encode(text), 'sim gzip -9');
    expectEqual((await m.sh('gzip -dc < text.gz | wc -l; zcat text')).out, '10\n' + text);
    expectEqual(await m.sh('gzip -k text.gz'), { out: '', err: 'gzip: text.gz already has .gz suffix -- unchanged\n', status: 0 });
    await m.sh('gunzip -k text.gz');
    expectEqual(await m.sh('gzip text'), { out: '', err: 'gzip: text.gz already exists;\tnot overwritten\n', status: 2 });
    expectEqual(await m.sh('gunzip text'), { out: '', err: 'gzip: text: unknown suffix -- ignored\n', status: 2 });
    expectEqual(await m.sh('echo hi > bad.gz; gunzip bad.gz'), { out: '', err: '\ngzip: bad.gz: not in gzip format\n', status: 1 });
    expectEqual((await m.sh('compress -c text > t.Z; zcat t.Z | wc -l; zcat -f text | wc -l')).out, '10\n10\n');
    expectEqual((await m.sh('mkdir -p dir/s; cp text dir/s/a; gzip -r dir; ls dir/s; gunzip -r dir; ls dir/s')).out, 'a.gz\na\n');
    expectEqual((await m.sh('gzip -c text text | gzip -dc | wc -l')).out, '20\n');
    expectEqual((await m.sh('gzip -lv text.gz')).out.split('\n')[1].slice(0, 15), 'defla db39e0e4 ');
});

// ---------------------------------------------------------------- ar

test('ar writes GNU ar archives byte for byte and lists like GNU ar', async () => {
    const m = machine();
    await m.sh("printf 'alpha\\n' > a.txt; printf 'yy\\n' > averyveryverylongname.o; ar rc lib.a a.txt averyveryverylongname.o");
    same(m.get('/home/operator/lib.a'), bytes('lib.a'), 'ar bytes');
    m.put('/tmp/host.a', bytes('lib.a'));
    expectEqual((await m.sh('ar tv /tmp/host.a')).out,
        'rw-r--r-- 0/0      6 Jan  1 00:00 1970 a.txt\nrw-r--r-- 0/0      3 Jan  1 00:00 1970 averyveryverylongname.o\n');
    expectEqual((await m.sh('ar p /tmp/host.a averyveryverylongname.o')).out, 'yy\n');
    expectEqual((await m.sh('ar rv new.a a.txt; ar qv new.a a.txt; ar t new.a; ar dv new.a a.txt; ar t new.a')),
        { out: 'a - a.txt\na - a.txt\na.txt\na.txt\nd - a.txt\na.txt\n', err: 'ar: creating new.a\n', status: 0 });
    expectEqual((await m.sh('mkdir x; cd x; ar xv ../lib.a a.txt; cat a.txt')).out, 'x - a.txt\nalpha\n');
    expectEqual(await m.sh('ar t missing.a'), { out: '', err: 'ar: missing.a: No such file or directory\n', status: 1 });
    expectEqual((await m.sh('ar t a.txt')).err, 'ar: a.txt: file format not recognized\n');
});

run('archive');
