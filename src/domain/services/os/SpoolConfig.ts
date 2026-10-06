import { FileSystemService } from '../FileSystemService';

/**
 * SpoolConfig - the configuration and spool directories of the batch and
 * queueing services on every host: the print queues (/etc/printcap,
 * /var/spool/cups), the UUCP neighbour systems (/etc/uucp/sys, Taylor UUCP
 * format, /var/spool/uucp) and the cron/at spools under /var/spool/cron.
 * Nothing here talks to a network: remote UUCP jobs stay queued.
 */
export const PRINTCAP = '# /etc/printcap: print queues (first entry is the system default)\n' +
    'lp|line printer:lp=/dev/lp0:sd=/var/spool/cups:\n' +
    'laser|LaserJet in the operations room:lp=/dev/usb/lp0:sd=/var/spool/cups:\n';

export const UUCP_SYSTEMS = ['relay', 'archive', 'mainframe'];

function uucpSys(): string {
    return '# /etc/uucp/sys: remote systems this host may call (Taylor UUCP)\n' +
        UUCP_SYSTEMS.map(s => `\nsystem ${s}\ncall-login nuucp\ncall-password *\ntime any\nport TCP\naddress ${s}.lan\n` +
            'commands rmail rnews lp date uname echo\n').join('');
}

export function installSpoolConfig(fs: FileSystemService): void {
    const dirs: [string, number, number, number][] = [
        ['/etc/uucp', 0o755, 0, 0],
        ['/var/spool/cups', 0o710, 0, 0],
        ['/var/spool/uucp', 0o755, 0, 0],
        ['/var/spool/uucppublic', 0o1777, 0, 0],
        ['/var/spool/cron/atjobs', 0o1770, 1, 1],
        ['/var/spool/cron/crontabs', 0o1730, 0, 0],
    ];
    for (const [path, mode, uid, gid] of dirs) {
        if (!fs.resolve(path, '/')) fs.mkdirp(path, mode, uid, gid, '/');
        fs.chmod(path, mode, '/');
        fs.chown(path, uid, gid, '/');
    }
    const files: [string, string][] = [['/etc/printcap', PRINTCAP], ['/etc/uucp/sys', uucpSys()]];
    for (const [path, data] of files) {
        if (fs.resolve(path, '/')) continue;
        fs.writeFile(path, data, 'w', 0, 0, '/');
        fs.chmod(path, 0o644, '/');
    }
}
