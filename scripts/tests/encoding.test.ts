/**
 * Encoding utilities with fixed expectations (the host lacks uuencode, so
 * these are checked against values produced by GNU sharutils).
 */
import { test, expectEqual, run } from './harness';
import { ShellFactory } from '../../src/domain/factories/ShellFactory';
import { createInitialTerminalState } from '../../src/domain/entities/TerminalState';

async function sh(script: string) {
    const { executor, fsService } = ShellFactory.create();
    fsService.mkdirp('/home/operator/w', 0o755, 1000, 1000);
    const res = await executor.executeWithSeparateStreams(script, { ...createInitialTerminalState(), currentDirectory: '/home/operator/w' });
    return { out: res.output, status: res.exitCode };
}

test('uuencode historical format', async () => {
    expectEqual((await sh(`printf 'hello world\\n' > f; chmod 644 f; uuencode f name`)).out,
        'begin 644 name\n,:&5L;&\\@=V]R;&0*\n`\nend\n');
});

test('uuencode base64 format', async () => {
    expectEqual((await sh(`printf 'hello world\\n' > f; chmod 644 f; uuencode -m f name`)).out,
        'begin-base64 644 name\naGVsbG8gd29ybGQK\n====\n');
});

test('uudecode round trips binary data', async () => {
    const r = await sh(`printf 'binary\\001\\002\\377\\n' > f; uuencode f out > f.uu; uudecode f.uu; cmp f out && echo same; uuencode -m f out2 | uudecode; cmp f out2 && echo same2; uuencode f x | uudecode -o y; cmp f y && echo same3`);
    expectEqual(r.out, 'same\nsame2\nsame3\n');
});

test('uudecode rejects junk', async () => {
    expectEqual((await sh(`echo junk > bad; uudecode bad 2>/dev/null; echo st=$?`)).out, 'st=1\n');
});

run('Encoding utilities');
