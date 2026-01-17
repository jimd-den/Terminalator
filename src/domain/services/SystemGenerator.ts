import { FileSystem, Dentry, Inode, FileType, S_IFDIR, S_IFREG, S_IRWXU, S_IRGRP, S_IXGRP, S_IROTH, S_IXOTH } from '../entities/FileSystem';

export interface SystemGenerationOptions {
    difficulty: number; // 1-10
    faction?: string;   // e.g. 'corporate', 'military', 'research'
}

export class SystemGenerator {
    private generatedSystems: number = 0;

    constructor() { }

    /**
     * Generates a unique, procedurally generated file system.
     */
    generate(options: SystemGenerationOptions): FileSystem {
        const fs = new FileSystem();
        const faction = options.faction || 'corporate';
        const hostname = this.generateHostname(faction);
        this.generatedSystems++;

        this.populateSystem(fs, options);

        // Set hostname in /etc/hostname
        fs.writeFile('/etc/hostname', hostname, 'w');

        return fs;
    }

    private generateHostname(faction: string = 'corporate'): string {
        const theme = this.getTheme(faction);
        const prefix = theme.hostPrefixes[Math.floor(Math.random() * theme.hostPrefixes.length)];
        const suffix = theme.hostSuffixes[Math.floor(Math.random() * theme.hostSuffixes.length)];
        const num = Math.floor(Math.random() * 999);
        return `${prefix}-${suffix}-${num.toString().padStart(3, '0')}`;
    }

    private getTheme(faction: string): NarrativeTheme {
        switch (faction) {
            case 'military': return MILITARY_THEME;
            case 'research': return RESEARCH_THEME;
            case 'corporate': default: return CORPORATE_THEME;
        }
    }

    private populateSystem(fs: FileSystem, options: SystemGenerationOptions) {
        const faction = options.faction || 'corporate';
        const theme = this.getTheme(faction);

        // 1. Create Users (in /etc/passwd)
        const users = this.generateUsers(options.difficulty);
        let passwdContent = 'root:x:0:0:root:/root:/bin/bash\n';

        users.forEach(user => {
            passwdContent += `${user.name}:x:${user.uid}:${user.gid}:${user.fullname}:/home/${user.name}:/bin/bash\n`;
            // Create home dir
            try {
                fs.mkdir(`/home/${user.name}`, 0o750, user.uid, user.gid);

                // Add some personal files
                this.generateUserFiles(fs, `/home/${user.name}`, user, theme);
            } catch (e) {
                // ignore
            }
        });

        fs.writeFile('/etc/passwd', passwdContent, 'w');

        // 2. Generate Logs (/var/log)
        this.generateLogs(fs, theme);
    }

    private generateUsers(difficulty: number): { name: string, uid: number, gid: number, fullname: string }[] {
        // Higher difficulty -> more users? Or specific admins?
        const baseUsers = [
            { name: 'guest', uid: 1000, gid: 1000, fullname: 'Guest User' },
        ];

        if (difficulty > 3) {
            baseUsers.push({ name: 'admin', uid: 1001, gid: 1001, fullname: 'Administrator' });
        }

        // Random names
        return baseUsers;
    }

    private generateUserFiles(fs: FileSystem, homeDir: string, user: any, theme: NarrativeTheme) {
        // Generate random email
        if (theme.emails.length > 0) {
            const email = theme.emails[Math.floor(Math.random() * theme.emails.length)];
            fs.writeFile(`${homeDir}/mbox`, `From: ${email.from}\nSubject: ${email.subject}\n\n${email.body}`, 'w', '/');
            fs.chown(`${homeDir}/mbox`, user.uid, user.gid);
        }

        if (theme.todos.length > 0) {
            // Pick random todos
            const todos = theme.todos.sort(() => 0.5 - Math.random()).slice(0, 3);
            fs.writeFile(`${homeDir}/todo.list`, todos.join('\n'), 'w', '/');
            fs.chown(`${homeDir}/todo.list`, user.uid, user.gid);
        }
    }

    private generateLogs(fs: FileSystem, theme: NarrativeTheme) {
        // /var/log/syslog
        fs.writeFile('/var/log/syslog', theme.logs.join('\n'), 'w');
        // root owner default
    }
}

interface NarrativeTheme {
    hostPrefixes: string[];
    hostSuffixes: string[];
    emails: { from: string, subject: string, body: string }[];
    logs: string[];
    todos: string[];
}

const CORPORATE_THEME: NarrativeTheme = {
    hostPrefixes: ['CORP', 'HQ', 'FIN', 'SALES'],
    hostSuffixes: ['SRV', 'NODE', 'UNIT'],
    emails: [
        { from: 'hr@corp.net', subject: 'Policy Update', body: 'Please review the new data retention policy.' },
        { from: 'boss@corp.net', subject: 'Q3 Goals', body: 'We need to hit the targets this quarter.' }
    ],
    logs: ['Auth service started', 'Backup completed', 'User logged in'],
    todos: ['- Submit expense report', '- Update client list', '- Schedule meeting']
};

const MILITARY_THEME: NarrativeTheme = {
    hostPrefixes: ['CMD', 'TAC', 'DEF', 'SEC'],
    hostSuffixes: ['ALPHA', 'BRAVO', 'OMNI'],
    emails: [
        { from: 'cmd@mil.net', subject: 'Classified Briefing', body: 'Eyes only. Operation Blackout is a go.' }
    ],
    logs: ['Security alert level raised', 'Perimeter breach detected', 'Firewall active'],
    todos: ['- Patrol sector 7', '- Calibrate sensors', '- Inspect armory']
};

const RESEARCH_THEME: NarrativeTheme = {
    hostPrefixes: ['LAB', 'BIO', 'DATA', 'AI'],
    hostSuffixes: ['PRIME', 'CORE', 'NEXUS'],
    emails: [
        { from: 'lead@research.net', subject: 'Simulation Results', body: 'The anomaly is growing. See attached data.' }
    ],
    logs: ['Experiment 442 initiated', 'Containment field stable', 'Data anomaly detected'],
    todos: ['- Calibrate microscope', '- Order reagents', '- Restart simulation']
};
