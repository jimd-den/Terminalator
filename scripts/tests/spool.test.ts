/**
 * Batch, mail, print and UUCP services: at/batch/atq/atrm, crontab, man
 * (apropos/whatis), mailx, lp/lpstat/cancel and uucp/uux/uustat, all run
 * against an installed system as the login user.
 */
import { test, expectEqual, expectTrue, run } from './harness';
import { ShellFactory } from '../../src/domain/factories/ShellFactory';
import { createInitialTerminalState, TerminalState } from '../../src/domain/entities/TerminalState';
import { DEFAULT_UTILITIES } from '../../src/domain/services/os/UtilityCatalog';
import { findPages } from '../../src/domain/commands/core/ManCommand';
import { parseAtTime } from '../../src/domain/commands/shared/AtTimeSpec';
import { checkCrontab } from '../../src/domain/commands/shared/CronTable';
import { parseMbox, formatMbox } from '../../src/domain/commands/shared/Mailbox';

const ROOT = { uid: 0, gid: 0, groups: [0] };

function machine() {
    const shell = ShellFactory.createSystem();
    let state: TerminalState = createInitialTerminalState();
    const sh = async (line: string, as?: typeof ROOT) => {
        const res = await shell.executor.executeWithSeparateStreams(line, as ? { ...state, user: as } : state);
        if (!as) state = { ...state, ...res.newState };
        return { out: res.output, err: res.stderr ?? '', status: res.exitCode };
    };
    return { sh };
}

// --- at / batch ---------------------------------------------------------------

test('at time specifications', () => {
    const now = new Date(2026, 9, 4, 19, 30, 15);
    const at = (s: string) => {
        const r = parseAtTime(s.split(' '), now);
        return r.ok ? r.time.toString().substring(0, 24) : `error:${r.token}`;
    };
    expectEqual(at('now + 5 minutes'), 'Sun Oct 04 2026 19:35:00');
    expectEqual(at('now + 2 hours'), 'Sun Oct 04 2026 21:30:00');
    expectEqual(at('now + 1 day'), 'Mon Oct 05 2026 19:30:00');
    expectEqual(at('21:00'), 'Sun Oct 04 2026 21:00:00');
    expectEqual(at('0900'), 'Mon Oct 05 2026 09:00:00'); // already past today
    expectEqual(at('noon tomorrow'), 'Mon Oct 05 2026 12:00:00');
    expectEqual(at('midnight'), 'Mon Oct 05 2026 00:00:00');
    expectEqual(at('teatime'), 'Mon Oct 05 2026 16:00:00');
    expectEqual(at('9pm'), 'Sun Oct 04 2026 21:00:00');
    expectEqual(at('friday'), 'Fri Oct 09 2026 19:30:00');
    expectEqual(at('10:00 12/25/2026'), 'Fri Dec 25 2026 10:00:00');
    expectEqual(at('10:00 dec 25'), 'Fri Dec 25 2026 10:00:00');
    expectEqual(at('oct 1'), 'Fri Oct 01 2027 19:30:00'); // month-day already past: next year
    expectEqual(at('invalid'), 'error:invalid');
    expectEqual(at('25:00'), 'error:25:00');
});

test('at spools jobs; atq, at -c and atrm', async () => {
    const { sh } = machine();
    const r = await sh('echo "echo hi" | at -t 202612251030');
    expectEqual(r, { out: '', err: 'warning: commands will be executed using /bin/sh\njob 1 at Fri Dec 25 10:30:00 2026\n', status: 0 });
    expectEqual((await sh('echo ls | batch 2>&1 | tail -1')).out.replace(/at .*/, 'at T'), 'job 2 at T\n');
    expectEqual((await sh('atq')).out.split('\n')[0], '1\tFri Dec 25 10:30:00 2026 a operator');
    expectEqual((await sh('at -l -q b | cut -f1')).out, '2\n');
    const job = (await sh('at -c 1')).out;
    expectTrue(job.startsWith('#!/bin/sh\n# atrun uid=1000 gid=1000\n') && job.includes('\necho hi\n') && job.includes('cd /home/operator'), job);
    expectEqual(await sh('atrm 7'), { out: '', err: 'Cannot find jobid 7\n', status: 1 });
    expectEqual((await sh('atrm 1; atq | cut -f1')).out, '2\n');
    expectEqual((await sh('ls /var/spool/cron/atjobs', ROOT)).out.split('\n')[0].substring(0, 6), 'b00002');
    expectEqual(await sh('echo x | atrm 2', ROOT), { out: '', err: '', status: 0 });
});

test('at errors', async () => {
    const { sh } = machine();
    expectEqual(await sh('at bogus </dev/null'), { out: '', err: 'syntax error. Last token seen: bogus\nGarbled time\n', status: 1 });
    expectEqual(await sh('at </dev/null'), { out: '', err: 'Garbled time\n', status: 1 });
    expectEqual((await sh('at -t 200001010000 </dev/null')).err, 'at: refusing to create job destined in the past\n');
    expectEqual((await sh('at -f nofile now')).status, 1);
});

// --- crontab -----------------------------------------------------------------------

test('crontab syntax checking', () => {
    expectEqual(checkCrontab('# c\nMAILTO=root\n*/5 1-3,7 * jan-mar mon-fri cmd\n@daily x\n'), []);
    expectEqual(checkCrontab('61 * * * * x\n0 24 * * * x\n0 0 0 * * x\n0 0 1 13 * x\n0 0 * * 8 x\n0 0 * * *\n@often x\n'),
        ['minute', 'hour', 'day-of-month', 'month', 'day-of-week', 'command', 'time specifier']
            .map((m, i) => ({ line: i + 1, message: `bad ${m}` })));
});

test('crontab install, list, replace, remove', async () => {
    const { sh } = machine();
    expectEqual(await sh('crontab -l'), { out: '', err: 'no crontab for operator\n', status: 1 });
    expectEqual((await sh('echo "0 3 * * * backup" | crontab -; crontab -l')).out, '0 3 * * * backup\n');
    expectEqual((await sh('ls -l /var/spool/cron/crontabs/operator', ROOT)).out.substring(0, 10), '-rw-------');
    expectEqual(await sh('printf "junk\\n0 0 * * *\\n" | crontab -'),
        { out: '', err: '"-":1: bad minute\n"-":2: bad command\nerrors in crontab file, can\'t install.\n', status: 1 });
    expectEqual((await sh('crontab -l')).out, '0 3 * * * backup\n');
    expectEqual((await sh('printf "* * * * * x" > c; crontab c')).err, "new crontab file is missing newline before EOF, can't install.\n");
    expectEqual(await sh('crontab -u root -l'), { out: '', err: 'must be privileged to use -u\n', status: 1 });
    expectEqual((await sh('crontab -u operator -l', ROOT)).out, '0 3 * * * backup\n');
    expectEqual((await sh('crontab -r; crontab -r')).err, 'no crontab for operator\n');
    expectEqual((await sh('crontab')).status, 1);
});

test('crontab -e runs $EDITOR on a copy', async () => {
    const { sh } = machine();
    await sh('printf \'#!/bin/sh\\necho "*/10 * * * * poll" >> "$1"\\n\' > ed.sh; chmod +x ed.sh');
    expectEqual(await sh('EDITOR=./ed.sh crontab -e'),
        { out: '', err: 'no crontab for operator - using an empty one\ncrontab: installing new crontab\n', status: 0 });
    expectEqual((await sh('crontab -l')).out, '*/10 * * * * poll\n');
    expectEqual((await sh('EDITOR=true crontab -e')).err, 'crontab: no changes made to crontab\n');
    expectEqual((await sh('EDITOR=false crontab -e')).err, 'crontab: "false" exited with status 1\n');
});

// --- man ------------------------------------------------------------------------------

test('every installed utility has a manual page', () => {
    const missing = DEFAULT_UTILITIES.filter(u => findPages(u, null).length === 0);
    expectEqual(missing, []);
});

test('man formats pages like man-db', async () => {
    const { sh } = machine();
    const page = (await sh('man ls')).out.split('\n');
    expectEqual(page[0], 'LS(1)                            User Commands                           LS(1)');
    expectEqual(page.slice(1, 5), ['', 'NAME', '       ls - list directory contents', '']);
    expectEqual(page[5], 'SYNOPSIS');
    expectTrue(page.every(l => l.length <= 78), 'lines fit in 78 columns');
    expectEqual((await sh('man 1 ls | head -1')).out, page[0] + '\n');
    expectEqual((await sh('man -s 5 crontab | head -1')).out.trim(), 'CRONTAB(5)                    File Formats Manual                   CRONTAB(5)');
    expectEqual((await sh('man LS | sed -n 4p')).out, '       ls - list directory contents\n');
    expectEqual((await sh('MANWIDTH=60 man grep | head -1')).out.length, 59);
});

test('man errors and lookups', async () => {
    const { sh } = machine();
    expectEqual(await sh('man nosuch'), { out: '', err: 'No manual entry for nosuch\n', status: 16 });
    expectEqual(await sh('man 5 ls'), { out: '', err: 'No manual entry for ls in section 5\n', status: 16 });
    expectEqual(await sh('man'), { out: '', err: "What manual page do you want?\nFor example, try 'man man'.\n", status: 1 });
    expectEqual((await sh('man -w ls')).out, '/usr/share/man/man1/ls.1.gz\n');
    expectEqual((await sh('man -f crontab')).out, 'crontab (1)          - schedule periodic background work\ncrontab (5)          - tables for driving cron\n');
    expectEqual((await sh('whatis atq')).out, 'atq (1)              - queue, examine, or delete jobs for later execution\n');
    expectEqual(await sh('whatis zzz'), { out: '', err: 'zzz: nothing appropriate.\n', status: 16 });
    expectTrue((await sh('man -k directory')).out.includes('ls (1)               - list directory contents\n'), 'man -k');
    expectEqual((await sh('apropos -e cron')).out, 'crontab (5)          - tables for driving cron\n');
    expectEqual((await sh('man -a crontab | grep -c "^NAME"')).out, '2\n');
});

// --- mailx -------------------------------------------------------------------------------

test('mbox round trip quotes From lines', () => {
    const m = { envelope: 'a@h', date: 'Sun Oct  4 19:30:00 2026', headers: [['Subject', 's']] as [string, string][], body: 'From here\nok\n' };
    const text = formatMbox(m) + formatMbox({ ...m, body: 'two\n' });
    expectTrue(text.includes('\n>From here\n'), text);
    const back = parseMbox(text);
    expectEqual(back.map(x => x.body), ['From here\nok\n', 'two\n']);
});

test('mailx sends to /var/mail in mbox format', async () => {
    const { sh } = machine();
    expectEqual(await sh('mailx -e'), { out: '', err: '', status: 1 });
    expectEqual(await sh('echo "meet at 5" | mailx -s Status operator'), { out: '', err: '', status: 0 });
    const box = (await sh('cat /var/mail/operator')).out;
    expectTrue(/^From operator@terminalator  \w{3} \w{3} [ \d]\d \d\d:\d\d:\d\d \d{4}\n/.test(box), box);
    expectTrue(box.includes('\nTo: operator\n') && box.includes('\nSubject: Status\n') && /\nDate: \w{3}, \d\d \w{3} \d{4} /.test(box), box);
    expectTrue(box.endsWith('\n\nmeet at 5\n\n'), box);
    expectEqual(await sh('mailx -e'), { out: '', err: '', status: 0 });
    expectEqual((await sh('mailx -s x </dev/null')).status, 1);
    expectEqual((await sh('mailx </dev/null operator')).err, "Null message body; hope that's ok\n");
});

test('mailx bounces mail for unknown users and copies -c/-b', async () => {
    const { sh } = machine();
    await sh('echo hi | mailx -s t -b root ghost');
    expectEqual((await sh('grep -c "^From " /var/mail/root', ROOT)).out, '1\n');
    expectEqual((await sh('grep -c Bcc /var/mail/root', ROOT)).out, '0\n');
    const box = (await sh('cat /var/mail/operator')).out;
    expectTrue(box.startsWith('From MAILER-DAEMON  ') && box.includes('<ghost@terminalator>: unknown user: "ghost"'), box);
});

test('mailx receive mode reads commands from stdin', async () => {
    const { sh } = machine();
    await sh('echo one | mailx -s first operator; echo two | mailx -s second operator; echo three | mailx -s third operator');
    const headers = (await sh('mailx -H')).out.split('\n');
    expectEqual(headers[0], '"/var/mail/operator": 3 messages 3 new');
    expectTrue(/^>N  1 operator@terminalato  \w{3} \w{3} [ \d]\d \d\d:\d\d +\d+\/\d+ +first$/.test(headers[1]), headers[1]);
    const r = await sh('printf "p 2\\nd 3\\nq\\n" | mailx -N');
    expectTrue(r.out.startsWith('Message 2:\nFrom operator@terminalator  ') && r.out.includes('\nSubject: second\n') && r.out.includes('\n\ntwo\n'), r.out);
    expectTrue(r.out.endsWith('Saved 1 message in /home/operator/mbox\nHeld 1 message in /var/mail/operator\n'), r.out);
    expectEqual((await sh('grep "^Subject" /var/mail/operator; grep "^Subject" mbox')).out, 'Subject: first\nSubject: second\n');
    expectEqual((await sh('printf "x\\n" | mailx -N; grep -c "^From " /var/mail/operator')).out, '1\n');
    expectEqual((await sh('echo "s 1 saved" | mailx -N -f mbox; grep -c "^From " saved')).out, '"saved" [New file] 11/' + (await sh('wc -c < mbox')).out.trim() + '\n1\n');
    expectEqual((await sh('echo bogus | mailx -N')).out, 'Unknown command: "bogus"\nHeld 1 message in /var/mail/operator\n');
});

// --- lp / lpstat / cancel -------------------------------------------------------------------

test('lp queues requests', async () => {
    const { sh } = machine();
    expectEqual((await sh('echo report > r; lp r; lp -n 2 -t T r r; echo x | lp -d laser')).out,
        'request id is lp-1 (1 file(s))\nrequest id is lp-2 (2 file(s))\nrequest id is laser-3 (1 file(s))\n');
    expectEqual(await sh('lp -s r'), { out: '', err: '', status: 0 });
    expectEqual(await sh('lp -d nope r'), { out: '', err: 'lp: The printer or class does not exist.\n', status: 1 });
    expectEqual(await sh('lp missing'), { out: '', err: 'lp: Error - unable to access "missing" - No such file or directory\n', status: 1 });
    expectEqual(await sh('lp </dev/null'), { out: '', err: 'lp: Error - stdin is empty, so no job has been sent.\n', status: 1 });
    expectEqual((await sh('lp -n 0 r')).status, 1);
    expectEqual((await sh('PRINTER=laser lp r')).out, 'request id is laser-5 (1 file(s))\n');
});

test('lpstat reports printers and jobs; cancel removes them', async () => {
    const { sh } = machine();
    await sh('echo report > r; lp r; lp -d laser r');
    const jobs = (await sh('lpstat')).out.split('\n');
    expectTrue(/^lp-1 {20}operator {13}7   \w{3} \w{3} [ \d]\d \d\d:\d\d:\d\d \d{4}$/.test(jobs[0]), jobs[0]);
    expectEqual((await sh('lpstat -d; lpstat -r; lpstat -v lp')).out, 'system default destination: lp\nscheduler is running\ndevice for lp: /dev/lp0\n');
    expectTrue(/^printer lp now printing lp-1\.  enabled since /.test((await sh('lpstat -p lp')).out), 'lpstat -p');
    expectEqual((await sh('lpstat -o laser | cut -d" " -f1')).out, 'laser-2\n');
    expectEqual(await sh('lpstat -p bogus'), { out: '', err: 'lpstat: Invalid destination name in list "bogus".\n', status: 1 });
    expectEqual(await sh('cancel lp-9'), { out: '', err: 'cancel: cancel-job failed: Job #9 does not exist.\n', status: 1 });
    expectEqual((await sh('cancel 1', ROOT)).status, 0);
    expectEqual((await sh('lpstat | cut -d" " -f1')).out, 'laser-2\n');
    expectEqual((await sh('cancel laser; lpstat; lpstat -p lp | cut -d. -f1')).out, 'printer lp is idle\n');
    expectEqual((await sh('cancel')).status, 1);
});

test('cancel refuses other users\' requests', async () => {
    const { sh } = machine();
    await sh('echo x | lp', ROOT);
    expectEqual(await sh('cancel lp-1'), { out: '', err: 'cancel: cancel-job failed: Not authorized to cancel job #1.\n', status: 1 });
});

// --- uucp / uux / uustat ---------------------------------------------------------------------

test('uucp copies local files at once and queues remote transfers', async () => {
    const { sh } = machine();
    expectEqual((await sh('echo payload > f; uucp f copy; cat copy')).out, 'payload\n');
    expectEqual((await sh('uucp f newdir/x; cat newdir/x')).out, 'payload\n');
    expectEqual((await sh('uucp -f f nodir/x')).status, 1);
    expectEqual((await sh('uucp -j f relay!~/f')).out, 'relayN0004\n');
    expectEqual(await sh('uucp f nowhere!x'), { out: '', err: 'uucp: nowhere: System not found\n', status: 1 });
    expectEqual(await sh('uucp missing x'), { out: '', err: 'uucp: /home/operator/missing: No such file or directory\n', status: 1 });
    expectEqual((await sh('uucp')).status, 1);
    expectTrue(/^relayN0004 relay operator \d\d-\d\d \d\d:\d\d Sending \/home\/operator\/f \(8 bytes\) to ~\/f\n$/.test((await sh('uustat')).out), 'uustat listing');
    expectEqual((await sh('ls /var/spool/uucp/relay/C.')).out, 'relayN0004\n');
    expectEqual((await sh('uucp -m f g; mailx -H | grep -c "UUCP succeeded"')).out, '1\n');
});

test('uux queues remote commands and runs local ones', async () => {
    const { sh } = machine();
    expectEqual((await sh('uux -j "mainframe!uname -a"')).out, 'mainframeA0001\n');
    expectEqual((await sh('echo hello | uux -p "cat > out"; cat out')).out, 'hello\n');
    expectEqual((await sh('uux date')).out, '');
    expectEqual(await sh('uux "((("'), { out: '', err: 'uux: (((: Syntax error\n', status: 1 });
    expectEqual((await sh('uux bogus!date')).err, 'uux: bogus: System not found\n');
    expectEqual((await sh('uux nosuchcmd; mailx -H | grep -c failed')).out, '1\n');
    expectEqual((await sh('uux -n nosuchcmd2; mailx -H | grep -c failed')).out, '1\n');
    expectTrue((await sh('uustat')).out.includes(' mainframe operator ') && (await sh('uustat')).out.includes('Executing uname -a (sending 0 bytes)'), 'queued');
});

test('uustat job control', async () => {
    const { sh } = machine();
    await sh('uux -r "relay!date"; uux "archive!date"');
    expectEqual((await sh('uustat -s archive | cut -d" " -f1')).out, 'archiveA0002\n');
    expectTrue(/^relay {11}0C 1X  \d\d-\d\d \d\d:\d\d Waiting for a conversation\narchive {9}0C 1X /.test((await sh('uustat -q')).out), 'uustat -q');
    expectEqual(await sh('uustat -k nosuch'), { out: '', err: 'uustat: nosuch: Job not found\n', status: 1 });
    expectEqual(await sh('uustat -k relayA0001'), { out: '', err: '', status: 0 });
    expectEqual((await sh('uustat | cut -d" " -f1')).out, 'archiveA0002\n');
    expectEqual((await sh('uustat -r archiveA0002')).status, 0);
    expectEqual((await sh('uustat -s nosys')).err, 'uustat: nosys: System not found\n');
    expectEqual((await sh('uustat -a', ROOT)).out.split('\n').length, 2);
    await sh('uux "relay!date"', ROOT);
    expectEqual(await sh('uustat -k relayA0003'), { out: '', err: 'uustat: relayA0003: Not submitted by you\n', status: 1 });
    expectEqual((await sh('uustat -z')).status, 1);
});

run('Batch, mail, print and UUCP services');
