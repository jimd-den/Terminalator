import { FileSystem } from '../entities/FileSystem';
import { FileSystemService } from './FileSystemService';
import { ThemeRegistry, NarrativeTheme } from './themes/ThemeRegistry';

export interface SystemGenerationOptions {
    difficulty: number; // 1-10
    faction?: string;   // e.g. 'corporate', 'military', 'research'
}

export class SystemGenerator {
    private generatedSystems: number = 0;
    private themeRegistry: ThemeRegistry;

    constructor() {
        this.themeRegistry = new ThemeRegistry();
    }

    /**
     * Generates a unique, procedurally generated file system.
     */
    generate(options: SystemGenerationOptions): FileSystem {
        const fs = new FileSystem();
        const service = new FileSystemService(fs);
        const faction = options.faction || 'corporate';
        const hostname = this.generateHostname(faction);
        this.generatedSystems++;

        this.populateSystem(service, options);

        // Set hostname in /etc/hostname
        service.writeFile('/etc/hostname', hostname, 'w');

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
        return this.themeRegistry.get(faction);
    }

    public populate(service: FileSystemService, options: SystemGenerationOptions) {
        const faction = options.faction || 'corporate';
        const theme = this.getTheme(faction);

        // Ensure base directories
        service.mkdirp('/etc');
        service.mkdirp('/var/log');
        service.mkdirp('/home');
        service.mkdirp('/bin');
        service.mkdirp('/usr/bin');
        service.mkdirp('/tmp', 0o777);

        // 1. Create Users (in /etc/passwd)
        const users = this.generateUsers(options.difficulty);
        let passwdContent = 'root:x:0:0:root:/root:/bin/bash\n';

        users.forEach(user => {
            passwdContent += `${user.name}:x:${user.uid}:${user.gid}:${user.fullname}:/home/${user.name}:/bin/bash\n`;
            // Create home dir
            try {
                service.mkdirp(`/home/${user.name}`, 0o750, user.uid, user.gid);

                // Add some personal files
                this.generateUserFiles(service, `/home/${user.name}`, user, theme);
            } catch (e) {
                // ignore
            }
        });

        service.writeFile('/etc/passwd', passwdContent, 'w');

        // 2. Generate Logs (/var/log)
        this.generateLogs(service, theme);
    }

    private populateSystem(service: FileSystemService, options: SystemGenerationOptions) {
        this.populate(service, options);
    }

    private generateUsers(difficulty: number): { name: string, uid: number, gid: number, fullname: string }[] {
        // Higher difficulty -> more users? Or specific admins?
        const baseUsers = [
            { name: 'user', uid: 1000, gid: 1000, fullname: 'System Operator' },
            { name: 'guest', uid: 1001, gid: 1001, fullname: 'Guest User' },
        ];

        if (difficulty > 3) {
            baseUsers.push({ name: 'admin', uid: 1001, gid: 1001, fullname: 'Administrator' });
        }

        // Random names
        return baseUsers;
    }

    private generateUserFiles(service: FileSystemService, homeDir: string, user: any, theme: NarrativeTheme) {
        // Generate random email
        if (theme.emails.length > 0) {
            const email = theme.emails[Math.floor(Math.random() * theme.emails.length)];
            service.writeFile(`${homeDir}/mbox`, `From: ${email.from}\nSubject: ${email.subject}\n\n${email.body}`, 'w', undefined, undefined, '/');
            service.chown(`${homeDir}/mbox`, user.uid, user.gid);
        }

        if (theme.todos.length > 0) {
            // Pick random todos
            const todos = theme.todos.sort(() => 0.5 - Math.random()).slice(0, 3);
            service.writeFile(`${homeDir}/todo.list`, todos.join('\n'), 'w', undefined, undefined, '/');
            service.chown(`${homeDir}/todo.list`, user.uid, user.gid);
        }
    }

    private generateLogs(service: FileSystemService, theme: NarrativeTheme) {
        // /var/log/syslog
        service.writeFile('/var/log/syslog', theme.logs.join('\n'), 'w');
        // root owner default
    }
}

