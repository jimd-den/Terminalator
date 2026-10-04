/**
 * Installed-system tests: FHS layout, user databases, device nodes and the
 * POSIX permission model as experienced through the shell.
 */
import { test, expectEqual, expectTrue, run } from './harness';
import { ShellFactory } from '../../src/domain/factories/ShellFactory';
import { createInitialTerminalState, TerminalState } from '../../src/domain/entities/TerminalState';
import { DEFAULT_UTILITIES } from '../../src/domain/services/os/UtilityCatalog';

const ROOT = { uid: 0, gid: 0, groups: [0] };

function machine() {
    const shell = ShellFactory.createSystem();
    let state: TerminalState = createInitialTerminalState();
    const sh = async (line: string, as?: typeof ROOT) => {
        const res = await shell.executor.executeWithSeparateStreams(line, as ? { ...state, user: as } : state);
        if (!as) state = { ...state, ...res.newState };
        return { out: res.output, err: res.stderr ?? '', status: res.exitCode };
    };
    return { sh, shell };
}

test('every registered utility has an executable in /usr/bin', async () => {
    const shell = ShellFactory.create();
    const missing = shell.executor.getRegistry().getCommandNames().filter(n => !DEFAULT_UTILITIES.includes(n));
    expectEqual(missing.filter(n => !['gui', 'dispatch', ':', '.', 'break', 'continue', 'exit', 'export', 'readonly', 'return', 'set', 'shift', 'times', 'trap', 'unset', 'eval', 'exec'].includes(n)), []);
});

test('FHS layout with merged /usr', async () => {
    const { sh } = machine();
    expectEqual((await sh('readlink /bin; readlink /sbin; readlink /lib')).out, 'usr/bin\nusr/sbin\nusr/lib\n');
    expectEqual((await sh('for d in etc home root tmp var/log var/tmp dev proc usr/local/bin opt srv mnt; do [ -d /$d ] || echo missing $d; done')).out, '');
    expectEqual((await sh('ls -ld /root /tmp | cut -c1-10')).out, 'drwx------\ndrwxrwxrwt\n');
});

test('utilities run from their files in PATH', async () => {
    const { sh } = machine();
    expectEqual((await sh('command -v ls; /bin/echo via-path; /usr/bin/printf "%s\\n" abs')).out, '/usr/bin/ls\nvia-path\nabs\n');
});

test('user and group databases', async () => {
    const { sh } = machine();
    expectEqual((await sh('grep "^operator:" /etc/passwd | cut -d: -f1,3,4,6')).out, 'operator:1000:1000:/home/operator\n');
    expectEqual((await sh('id -un; id -u')).out, 'operator\n1000\n');
    expectEqual((await sh('ls -ld ~ | awk "{print \\$3}"')).status, 0);
});

test('shadow file is protected', async () => {
    const { sh } = machine();
    const r = await sh('cat /etc/shadow');
    expectTrue(r.status !== 0 && /Permission denied/.test(r.err), `expected EACCES, got ${JSON.stringify(r)}`);
    expectEqual((await sh("grep -c '^operator:[$]6[$]' /etc/shadow", ROOT)).out, '1\n');
});

test('write permission on directories', async () => {
    const { sh } = machine();
    const r = await sh('touch /etc/evil');
    expectTrue(r.status !== 0, 'operator must not create files in /etc');
    expectEqual((await sh('[ -e /etc/evil ] || echo absent')).out, 'absent\n');
    expectEqual((await sh('echo ok > /tmp/mine; cat /tmp/mine')).out, 'ok\n');
    const redirect = await sh('echo x > /etc/nope');
    expectTrue(redirect.status !== 0 && /Permission denied/.test(redirect.err), JSON.stringify(redirect));
});

test('sticky /tmp protects other users files', async () => {
    const { sh } = machine();
    await sh('echo root-owned > /tmp/rootfile', ROOT);
    const r = await sh('rm /tmp/rootfile');
    expectTrue(r.status !== 0, `operator removed root's file in /tmp: ${JSON.stringify(r)}`);
    expectEqual((await sh('rm /tmp/rootfile; [ -e /tmp/rootfile ] || echo gone', ROOT)).out, 'gone\n');
});

test('character devices', async () => {
    const { sh } = machine();
    expectEqual((await sh('echo discard > /dev/null; cat /dev/null; head -c 4 /dev/zero | wc -c | tr -d " "')).out, '4\n');
    expectEqual((await sh('ls -l /dev/null | cut -c1')).out, 'c\n');
    expectEqual((await sh('[ -c /dev/urandom ] && echo char')).out, 'char\n');
});

test('directory link counts follow POSIX', async () => {
    const { sh } = machine();
    expectEqual((await sh('mkdir -p /tmp/d/a /tmp/d/b; ls -ld /tmp/d | awk "{print \\$2}"')).out.trim(), '4');
});

test('home directory and profile', async () => {
    const { sh } = machine();
    expectEqual((await sh('cd; pwd; [ -f .profile ] && echo profile')).out, '/home/operator\nprofile\n');
});

run('Installed system');
