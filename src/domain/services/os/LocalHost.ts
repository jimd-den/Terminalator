import { HostProfile } from './SystemInstaller';

/** The player's own machine. */
export const LOCAL_HOST_PROFILE: HostProfile = {
    hostname: 'terminalator',
    domain: 'lan',
    ipAddress: '10.0.0.2',
    rootPassword: undefined, // root is locked; privilege must be earned in-game
    users: [{
        name: 'operator',
        uid: 1000,
        gid: 1000,
        gecos: 'Terminal Operator',
        password: 'operator',
        groups: ['staff', 'users'],
    }],
    motd: '\nTERMINALATOR OS 4.2 -- operator console\nType `help` or `man <command>`. Everything is a file.\n\n',
};
