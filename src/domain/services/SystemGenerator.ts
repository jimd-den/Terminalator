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

        // 2. Generate Binaries (/bin)
        this.generateBinaries(service);

        // 3. Generate Logs (/var/log)
        this.generateLogs(service, theme);
    }

    private generateBinaries(service: FileSystemService) {
        const tools = [
            { name: 'net-scan', desc: 'Lattice Node Scanner' },
            { name: 'net-link', desc: 'Secure Net-Link Client' },
            { name: 'transfer', desc: 'ZINC Transaction Utility' },
            { name: 'check-comms', desc: 'Secure Channel Synchronizer' },
            { name: 'ls', desc: 'List directory contents' },
            { name: 'cat', desc: 'Concatenate and print files' },
            { name: 'grep', desc: 'Search for patterns in files' },
            { name: 'awk', desc: 'Pattern scanning and processing language' },
            { name: 'sed', desc: 'Stream editor for filtering and transforming text' },
            { name: 'cd', desc: 'Change the working directory' },
            { name: 'pwd', desc: 'Print name of current/working directory' }
        ];

        tools.forEach(tool => {
            const content = `[ BINARY: ${tool.name.toUpperCase()} ]\n# ${tool.desc}\n# Authorized for system operator.`;
            service.writeFile(`/bin/${tool.name}`, content, 'w', 0, 0);
            service.chmod(`/bin/${tool.name}`, 0o755);
        });
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

        // Ensure admin always exists for tutorial missions
        baseUsers.push({ name: 'admin', uid: 1002, gid: 1002, fullname: 'Administrator' });

        if (difficulty > 3) {
            // Add more users for higher difficulty...
        }

        // Random names
        return baseUsers;
    }

    private generateUserFiles(service: FileSystemService, homeDir: string, user: any, theme: NarrativeTheme) {
        // Generate random email
        if (theme.emails.length > 0) {
            const email = theme.emails[Math.floor(Math.random() * theme.emails.length)];
            service.writeFile(`${homeDir}/mbox`, `From: ${email.from}\nSubject: ${email.subject}\n\n${email.body}`, 'w', user.uid, user.gid, homeDir);
        }

        if (theme.todos.length > 0) {
            // Pick random todos
            const todos = theme.todos.sort(() => 0.5 - Math.random()).slice(0, 3);
            service.writeFile(`${homeDir}/todo.list`, todos.join('\n'), 'w', user.uid, user.gid, homeDir);
        }

        // [USER REQUEST] Generate 5 test files for testing purposes if user is 'admin'
        if (user.name === 'admin') {
            // 1. Home
            service.writeFile(`${homeDir}/test_home.txt`, 'SYSTEM DIAGNOSTICS: ALL SYSTEMS NOMINAL\nGENERATED_ID: ' + Math.random().toString(16).slice(2), 'w', user.uid, user.gid, homeDir);

            // 2. Mail (subdir)
            service.mkdirp(`${homeDir}/mail`, 0o700, user.uid, user.gid);
            service.writeFile(`${homeDir}/mail/test_mail.eml`, 'Subject: SECURITY AUDIT\n\nTest mail for verification.', 'w', user.uid, user.gid, homeDir);

            // 3. Docs (nested)
            service.mkdirp(`${homeDir}/docs/nested`, 0o700, user.uid, user.gid);
            service.writeFile(`${homeDir}/docs/nested/test_nested.txt`, 'DEEP_NESTED_SECRET_001', 'w', user.uid, user.gid, homeDir);

            // 4. Src (app)
            service.mkdirp(`${homeDir}/src/app`, 0o755, user.uid, user.gid);
            service.writeFile(`${homeDir}/src/app/test_code.sh`, '#!/bin/bash\necho "Context Verified"', 'w', user.uid, user.gid, homeDir);

            // 5. Archive (zip)
            service.mkdirp(`${homeDir}/archive`, 0o700, user.uid, user.gid);
            service.writeFile(`${homeDir}/archive/test_backup.zip`, 'MOCK_ZIP_DATA_PK_0x0304', 'w', user.uid, user.gid, homeDir);
        }
    }

    private generateLogs(service: FileSystemService, theme: NarrativeTheme) {
        // /var/log/syslog
        service.writeFile('/var/log/syslog', theme.logs.join('\n'), 'w');
        // root owner default
    }
}

