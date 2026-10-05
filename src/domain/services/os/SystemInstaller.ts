/**
 * SystemInstaller - Domain Service
 *
 * Lays down a complete Unix system image on a (possibly empty) file system,
 * following the Filesystem Hierarchy Standard: real executables for every
 * utility in /usr/bin (with /bin, /sbin and /lib as compatibility symlinks),
 * the user/group/shadow databases, network configuration, device nodes in
 * /dev, kernel information in /proc, home directories and logs.
 *
 * Every host in the game — the player's machine and each generated network
 * host — is installed through this one service, so they all look and
 * behave like real machines.
 */
import { LocaleInstaller } from './LocaleInstaller';
import { FileSystemService } from '../FileSystemService';
import { DirectoryNode } from '../../entities/filesystem/DirectoryNode';
import { S_IFCHR } from '../../entities/FileSystem';
import { makedev } from '../../entities/filesystem/Devices';
import { UTILITY_STUB_PREFIX } from '../shell/CommandResolver';
import { installSpoolConfig } from './SpoolConfig';
import { DEFAULT_UTILITIES } from './UtilityCatalog';
import { passwordHash } from './PasswordHash';

export interface HostUser {
    name: string;
    uid: number;
    gid: number;
    gecos?: string;
    home?: string;
    shell?: string;
    /** Plain-text password (stored hashed in /etc/shadow). Undefined = locked account. */
    password?: string;
    /** Supplementary group names. */
    groups?: string[];
}

export interface HostGroup {
    name: string;
    gid: number;
    members?: string[];
}

export interface HostProfile {
    hostname: string;
    domain?: string;
    ipAddress?: string;
    /** Other machines this host knows by name (/etc/hosts). */
    knownHosts?: { ip: string; name: string }[];
    users: HostUser[];
    groups?: HostGroup[];
    rootPassword?: string;
    os?: { name: string; version: string; kernel: string; arch: string };
    motd?: string;
    /** Utility names to install as executables (defaults to the full catalog). */
    utilities?: string[];
    /** Boot time used for /proc/uptime and log timestamps (ms since epoch). */
    bootTime?: number;
}

const DEFAULT_OS = { name: 'Terminalator OS', version: '4.2', kernel: '6.6.0-term', arch: 'aarch64' };

/** System accounts present on every installation. */
const SYSTEM_USERS: HostUser[] = [
    { name: 'daemon', uid: 1, gid: 1, gecos: 'daemon', home: '/usr/sbin', shell: '/usr/sbin/nologin' },
    { name: 'bin', uid: 2, gid: 2, gecos: 'bin', home: '/bin', shell: '/usr/sbin/nologin' },
    { name: 'sys', uid: 3, gid: 3, gecos: 'sys', home: '/dev', shell: '/usr/sbin/nologin' },
    { name: 'sync', uid: 4, gid: 65534, gecos: 'sync', home: '/bin', shell: '/bin/sync' },
    { name: 'mail', uid: 8, gid: 8, gecos: 'mail', home: '/var/mail', shell: '/usr/sbin/nologin' },
    { name: 'www-data', uid: 33, gid: 33, gecos: 'www-data', home: '/var/www', shell: '/usr/sbin/nologin' },
    { name: 'sshd', uid: 105, gid: 65534, gecos: 'sshd', home: '/run/sshd', shell: '/usr/sbin/nologin' },
    { name: 'nobody', uid: 65534, gid: 65534, gecos: 'nobody', home: '/nonexistent', shell: '/usr/sbin/nologin' },
];

const SYSTEM_GROUPS: HostGroup[] = [
    { name: 'root', gid: 0 }, { name: 'daemon', gid: 1 }, { name: 'bin', gid: 2 }, { name: 'sys', gid: 3 },
    { name: 'adm', gid: 4 }, { name: 'tty', gid: 5 }, { name: 'disk', gid: 6 }, { name: 'mail', gid: 8 },
    { name: 'wheel', gid: 10 }, { name: 'sudo', gid: 27 }, { name: 'www-data', gid: 33 },
    { name: 'shadow', gid: 42 }, { name: 'staff', gid: 50 }, { name: 'users', gid: 100 },
    { name: 'nogroup', gid: 65534 },
];

export class SystemInstaller {
    install(fs: FileSystemService, profile: HostProfile): void {
        const os = profile.os ?? DEFAULT_OS;
        const users = profile.users;
        const bootTime = profile.bootTime ?? Date.now() - 3 * 24 * 3600 * 1000;

        this.layoutDirectories(fs);
        this.installUtilities(fs, profile.utilities ?? DEFAULT_UTILITIES);
        this.installAccounts(fs, profile);
        this.installEtc(fs, profile, os);
        installSpoolConfig(fs);
        this.installDevices(fs, users[0]?.uid ?? 0);
        this.installProc(fs, profile, os, bootTime);
        this.installHomes(fs, users);
        this.installLogs(fs, profile, os, bootTime);
        new LocaleInstaller().install(fs);
    }

    // --- Directory tree ------------------------------------------------------

    private layoutDirectories(fs: FileSystemService) {
        const dirs: [string, number][] = [
            ['/usr', 0o755], ['/usr/bin', 0o755], ['/usr/sbin', 0o755], ['/usr/lib', 0o755],
            ['/usr/local', 0o755], ['/usr/local/bin', 0o755], ['/usr/local/lib', 0o755],
            ['/usr/include', 0o755], ['/usr/share', 0o755], ['/usr/share/doc', 0o755],
            ['/usr/share/man', 0o755], ['/usr/share/man/man1', 0o755], ['/usr/share/dict', 0o755],
            ['/etc', 0o755], ['/etc/ssh', 0o755], ['/etc/cron.d', 0o755], ['/etc/skel', 0o755],
            ['/home', 0o755], ['/root', 0o700], ['/tmp', 0o1777],
            ['/var', 0o755], ['/var/log', 0o755], ['/var/tmp', 0o1777], ['/var/mail', 0o2775],
            ['/var/spool', 0o755], ['/var/spool/cron', 0o755], ['/var/lib', 0o755], ['/var/cache', 0o755],
            ['/var/www', 0o755], ['/var/backups', 0o755],
            ['/run', 0o755], ['/dev', 0o755], ['/dev/pts', 0o755], ['/dev/shm', 0o1777],
            ['/proc', 0o555], ['/proc/sys', 0o555], ['/proc/sys/kernel', 0o555], ['/proc/net', 0o555],
            ['/sys', 0o555], ['/mnt', 0o755], ['/media', 0o755], ['/opt', 0o755], ['/srv', 0o755], ['/boot', 0o755],
        ];
        for (const [path, mode] of dirs) {
            if (!fs.resolve(path, '/')) fs.mkdirp(path, mode, 0, 0);
            fs.chmod(path, mode, '/');
            fs.chown(path, 0, 0, '/');
        }
        fs.chown('/var/mail', 0, 8, '/');

        // Merged /usr: the classic top-level directories point into /usr.
        for (const [link, target] of [['/bin', 'usr/bin'], ['/sbin', 'usr/sbin'], ['/lib', 'usr/lib']]) {
            const node = fs.resolve(link, '/', false);
            if (node instanceof DirectoryNode) {
                if (node.children.size > 0) continue; // keep a populated legacy directory
                fs.deleteNode(link, '/');
            } else if (node) {
                continue;
            }
            fs.symlink(target, link, 0, 0, '/');
        }
    }

    private installUtilities(fs: FileSystemService, utilities: string[]) {
        for (const name of utilities) {
            if (name.includes('/')) continue;
            const path = `/usr/bin/${name}`;
            fs.writeFile(path, `${UTILITY_STUB_PREFIX}${name}\n`, 'w', 0, 0, '/');
            fs.chmod(path, 0o755, '/');
        }
        // Setuid helpers, as on a real system (targets for privilege-escalation puzzles).
        for (const name of ['su', 'passwd', 'sudo']) {
            if (fs.resolve(`/usr/bin/${name}`, '/')) fs.chmod(`/usr/bin/${name}`, 0o4755, '/');
        }
    }

    // --- Accounts ------------------------------------------------------------

    private installAccounts(fs: FileSystemService, profile: HostProfile) {
        const users: HostUser[] = [
            { name: 'root', uid: 0, gid: 0, gecos: 'root', home: '/root', shell: '/bin/sh', password: profile.rootPassword },
            ...SYSTEM_USERS,
            ...profile.users,
        ];
        const groups = new Map<string, HostGroup>();
        for (const g of [...SYSTEM_GROUPS, ...(profile.groups ?? [])]) groups.set(g.name, { ...g, members: [...(g.members ?? [])] });
        for (const u of profile.users) {
            if (![...groups.values()].some(g => g.gid === u.gid)) groups.set(u.name, { name: u.name, gid: u.gid, members: [] });
            for (const gname of u.groups ?? []) {
                const g = groups.get(gname);
                if (g && !g.members!.includes(u.name)) g.members!.push(u.name);
            }
        }

        const passwd = users.map(u =>
            `${u.name}:x:${u.uid}:${u.gid}:${u.gecos ?? u.name}:${u.home ?? `/home/${u.name}`}:${u.shell ?? '/bin/sh'}`
        ).join('\n') + '\n';
        const group = [...groups.values()].sort((a, b) => a.gid - b.gid)
            .map(g => `${g.name}:x:${g.gid}:${(g.members ?? []).join(',')}`).join('\n') + '\n';
        const shadow = users.map(u => {
            const hash = u.password === undefined ? (u.uid === 0 ? '!' : '*') : passwordHash(u.password, u.name);
            return `${u.name}:${hash}:19700:0:99999:7:::`;
        }).join('\n') + '\n';
        const gshadow = [...groups.values()].map(g => `${g.name}:!::${(g.members ?? []).join(',')}`).join('\n') + '\n';

        this.write(fs, '/etc/passwd', passwd, 0o644);
        this.write(fs, '/etc/group', group, 0o644);
        this.write(fs, '/etc/shadow', shadow, 0o640, 0, 42);
        this.write(fs, '/etc/gshadow', gshadow, 0o640, 0, 42);

        const sudoers = groups.get('sudo')?.members ?? [];
        this.write(fs, '/etc/sudoers',
            '# /etc/sudoers: who may run what as whom\n' +
            'Defaults\tenv_reset\n' +
            'root\tALL=(ALL:ALL) ALL\n' +
            '%sudo\tALL=(ALL:ALL) ALL\n' +
            (sudoers.length ? `# members of sudo: ${sudoers.join(', ')}\n` : ''),
            0o440);
    }

    // --- /etc ----------------------------------------------------------------

    private installEtc(fs: FileSystemService, p: HostProfile, os: typeof DEFAULT_OS) {
        const fqdn = p.domain ? `${p.hostname}.${p.domain}` : p.hostname;
        this.write(fs, '/etc/hostname', `${p.hostname}\n`);
        this.write(fs, '/etc/hosts', [
            '127.0.0.1\tlocalhost',
            `127.0.1.1\t${fqdn} ${p.hostname}`,
            ...(p.ipAddress ? [`${p.ipAddress}\t${fqdn} ${p.hostname}`] : []),
            ...(p.knownHosts ?? []).map(h => `${h.ip}\t${h.name}`),
            '::1\t\tlocalhost ip6-localhost ip6-loopback',
        ].join('\n') + '\n');
        this.write(fs, '/etc/os-release', [
            `PRETTY_NAME="${os.name} ${os.version}"`, `NAME="${os.name}"`, `VERSION_ID="${os.version}"`,
            `VERSION="${os.version}"`, 'ID=terminalator', 'HOME_URL="https://terminalator.invalid/"',
        ].join('\n') + '\n');
        this.write(fs, '/etc/issue', `${os.name} ${os.version} \\n \\l\n\n`);
        this.write(fs, '/etc/motd', p.motd ?? `\nWelcome to ${os.name} ${os.version} (${os.kernel} ${os.arch})\n\nAuthorized access only. All activity is logged.\n\n`);
        this.write(fs, '/etc/shells', '# /etc/shells: valid login shells\n/bin/sh\n/usr/bin/sh\n/bin/bash\n/usr/bin/bash\n/bin/dash\n');
        this.write(fs, '/etc/profile',
            '# /etc/profile: system-wide .profile for sh(1)\n' +
            'PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"\n' +
            'export PATH\n' +
            'if [ "$(id -u)" -eq 0 ]; then PS1=\'# \'; else PS1=\'$ \'; fi\n' +
            'umask 022\n');
        this.write(fs, '/etc/fstab', '# <fs>\t<mount>\t<type>\t<options>\t<dump>\t<pass>\n/dev/vda1\t/\text4\terrors=remount-ro\t0\t1\nproc\t/proc\tproc\tdefaults\t0\t0\ntmpfs\t/tmp\ttmpfs\tmode=1777\t0\t0\n');
        this.write(fs, '/etc/resolv.conf', `nameserver 10.0.0.53\nsearch ${p.domain ?? 'local'}\n`);
        this.write(fs, '/etc/services', [
            'ftp\t\t21/tcp', 'ssh\t\t22/tcp', 'telnet\t\t23/tcp', 'smtp\t\t25/tcp\tmail', 'domain\t\t53/udp',
            'http\t\t80/tcp\twww', 'pop3\t\t110/tcp', 'ntp\t\t123/udp', 'imap\t\t143/tcp', 'snmp\t\t161/udp',
            'https\t\t443/tcp', 'mysql\t\t3306/tcp', 'postgresql\t5432/tcp', 'redis\t\t6379/tcp', 'http-alt\t8080/tcp',
        ].join('\n') + '\n');
        this.write(fs, '/etc/protocols', 'ip\t0\tIP\nicmp\t1\tICMP\ntcp\t6\tTCP\nudp\t17\tUDP\n');
        this.write(fs, '/etc/crontab', 'SHELL=/bin/sh\nPATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin\n# m h dom mon dow user\tcommand\n17 *\t* * *\troot\tcd / && run-parts --report /etc/cron.hourly\n');
        this.write(fs, '/etc/ssh/sshd_config', 'Port 22\nPermitRootLogin prohibit-password\nPasswordAuthentication yes\nPubkeyAuthentication yes\nSubsystem sftp /usr/lib/openssh/sftp-server\n');
        this.write(fs, '/etc/timezone', 'Etc/UTC\n');
        this.write(fs, '/etc/skel/.profile', '# ~/.profile: executed by sh(1) for login shells\nPATH="$HOME/bin:$PATH"\n');
    }

    // --- /dev ----------------------------------------------------------------

    private installDevices(fs: FileSystemService, loginUid: number) {
        const devices: [string, number, number, number, number?][] = [
            ['null', 1, 3, 0o666], ['zero', 1, 5, 0o666], ['full', 1, 7, 0o666],
            ['random', 1, 8, 0o666], ['urandom', 1, 9, 0o666],
            ['tty', 5, 0, 0o666, 5], ['console', 5, 1, 0o600, 5],
        ];
        for (const [name, maj, min, mode, gid] of devices) {
            const path = `/dev/${name}`;
            if (fs.resolve(path, '/', false)) continue;
            fs.mknod(path, S_IFCHR | mode, makedev(maj, min), 0, gid ?? 0, '/');
        }
        // The login session's pseudo-terminal: owned by the user, group tty, writable by tty (mesg y).
        if (!fs.resolve('/dev/pts/0', '/', false)) fs.mknod('/dev/pts/0', S_IFCHR | 0o620, makedev(136, 0), loginUid, 5, '/');
        const links: [string, string][] = [
            ['/dev/fd', '/proc/self/fd'], ['/dev/stdin', '/proc/self/fd/0'],
            ['/dev/stdout', '/proc/self/fd/1'], ['/dev/stderr', '/proc/self/fd/2'],
        ];
        for (const [link, target] of links) {
            if (!fs.resolve(link, '/', false)) fs.symlink(target, link, 0, 0, '/');
        }
    }

    // --- /proc ---------------------------------------------------------------

    private installProc(fs: FileSystemService, p: HostProfile, os: typeof DEFAULT_OS, bootTime: number) {
        const uptime = Math.max(1, (Date.now() - bootTime) / 1000);
        const ro = 0o444;
        this.write(fs, '/proc/version', `Linux version ${os.kernel} (builder@${os.name.toLowerCase().replace(/\s+/g, '-')}) (gcc 13.2.0) #1 SMP PREEMPT\n`, ro);
        this.write(fs, '/proc/uptime', `${uptime.toFixed(2)} ${(uptime * 3.7).toFixed(2)}\n`, ro);
        this.write(fs, '/proc/loadavg', '0.08 0.03 0.01 1/97 4242\n', ro);
        this.write(fs, '/proc/cpuinfo', [0, 1, 2, 3].map(n =>
            `processor\t: ${n}\nBogoMIPS\t: 48.00\nFeatures\t: fp asimd evtstrm aes pmull sha1 sha2 crc32\nCPU implementer\t: 0x41\nCPU part\t: 0xd08\n`).join('\n'), ro);
        this.write(fs, '/proc/meminfo', 'MemTotal:        4028844 kB\nMemFree:         2311204 kB\nMemAvailable:    3307516 kB\nBuffers:           61228 kB\nCached:           908712 kB\nSwapTotal:       1048572 kB\nSwapFree:        1048572 kB\n', ro);
        this.write(fs, '/proc/mounts', '/dev/vda1 / ext4 rw,relatime 0 0\nproc /proc proc rw,nosuid,nodev,noexec 0 0\ntmpfs /tmp tmpfs rw,nosuid,nodev 0 0\n', ro);
        this.write(fs, '/proc/filesystems', 'nodev\tsysfs\nnodev\ttmpfs\nnodev\tproc\n\text4\n', ro);
        this.write(fs, '/proc/cmdline', 'root=/dev/vda1 ro quiet\n', ro);
        this.write(fs, '/proc/sys/kernel/hostname', `${p.hostname}\n`, ro);
        this.write(fs, '/proc/sys/kernel/ostype', 'Linux\n', ro);
        this.write(fs, '/proc/sys/kernel/osrelease', `${os.kernel}\n`, ro);
        this.write(fs, '/proc/net/dev', 'Inter-|   Receive                |  Transmit\n face |bytes    packets errs drop|bytes    packets errs drop\n    lo:   48213     512    0    0    48213     512    0    0\n  eth0: 9123456   12345    0    0  2345678    9876    0    0\n', ro);
    }

    // --- Homes & logs --------------------------------------------------------

    private installHomes(fs: FileSystemService, users: HostUser[]) {
        this.write(fs, '/root/.profile', '# ~/.profile\nPATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"\n', 0o644);
        for (const u of users) {
            const home = u.home ?? `/home/${u.name}`;
            if (!home.startsWith('/home/')) continue;
            if (!fs.resolve(home, '/')) fs.mkdirp(home, 0o755, u.uid, u.gid);
            fs.chown(home, u.uid, u.gid, '/');
            fs.chmod(home, 0o755, '/');
            const profile = `${home}/.profile`;
            if (!fs.resolve(profile, '/')) {
                fs.writeFile(profile, '# ~/.profile: executed by sh(1) for login shells\nPATH="$HOME/bin:$PATH"\n', 'w', u.uid, u.gid, '/');
            }
            const mail = `/var/mail/${u.name}`;
            if (!fs.resolve(mail, '/')) {
                fs.writeFile(mail, '', 'w', u.uid, 8, '/');
                fs.chmod(mail, 0o660, '/');
            }
        }
    }

    private installLogs(fs: FileSystemService, p: HostProfile, os: typeof DEFAULT_OS, bootTime: number) {
        const stamp = (offsetSec: number) => {
            const d = new Date(bootTime + offsetSec * 1000);
            const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()];
            return `${mon} ${String(d.getDate()).padStart(2, ' ')} ${d.toTimeString().substring(0, 8)}`;
        };
        const h = p.hostname;
        if (!fs.resolve('/var/log/syslog', '/')) {
            this.write(fs, '/var/log/syslog', [
                `${stamp(0)} ${h} kernel: [    0.000000] Booting Linux on physical CPU 0x0`,
                `${stamp(0)} ${h} kernel: [    0.000000] Linux version ${os.kernel}`,
                `${stamp(2)} ${h} systemd[1]: Mounting /tmp...`,
                `${stamp(3)} ${h} systemd[1]: Started OpenSSH server daemon.`,
                `${stamp(4)} ${h} cron[311]: (CRON) INFO (Running @reboot jobs)`,
            ].join('\n') + '\n', 0o640, 0, 4);
        }
        if (!fs.resolve('/var/log/auth.log', '/')) {
            const lines = [`${stamp(5)} ${h} sshd[402]: Server listening on 0.0.0.0 port 22.`];
            for (const u of p.users.slice(0, 3)) {
                lines.push(`${stamp(3600)} ${h} sshd[1187]: Accepted password for ${u.name} from 10.0.0.${10 + u.uid % 200} port 51122 ssh2`);
            }
            this.write(fs, '/var/log/auth.log', lines.join('\n') + '\n', 0o640, 0, 4);
        }
        if (!fs.resolve('/var/log/dmesg', '/')) {
            this.write(fs, '/var/log/dmesg', `[    0.000000] Linux version ${os.kernel}\n[    0.412000] eth0: link up\n`, 0o644);
        }
    }

    private write(fs: FileSystemService, path: string, content: string, mode = 0o644, uid = 0, gid = 0) {
        fs.writeFile(path, content, 'w', uid, gid, '/');
        fs.chmod(path, mode, '/');
        fs.chown(path, uid, gid, '/');
    }
}
