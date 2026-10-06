/**
 * UserDatabase - getpwnam/getpwuid/getgrnam/getgrgid over the simulated
 * machine's own /etc/passwd and /etc/group (XBD "User Database",
 * "Group Database"). Each host therefore has its own users. When the
 * files do not exist (minimal test file systems), the built-in defaults
 * from IdentityService are used.
 */
import { FileSystemService } from './FileSystemService';
import { IdentityService } from './IdentityService';
import { User } from '../entities/User';
import { Group } from '../entities/Group';

export class UserDatabase {
    private static fallback = new IdentityService();

    constructor(private fs: FileSystemService) { }

    private read(path: string): string | null {
        try {
            const node = this.fs.resolve(path, '/');
            if (!node || this.fs.isDirectory(node)) return null;
            return this.fs.readFile(path);
        } catch {
            return null;
        }
    }

    users(): User[] {
        const text = this.read('/etc/passwd');
        if (text === null) return UserDatabase.fallback.getAllUsers();
        const groups = this.groups();
        return text.split('\n').filter(l => l && !l.startsWith('#')).map(line => {
            const [username, , uid, gid, gecos, home, shell] = line.split(':');
            const name = username ?? '';
            const supplementary = groups.filter(g => g.members.includes(name)).map(g => g.gid);
            const primary = parseInt(gid, 10) || 0;
            return {
                uid: parseInt(uid, 10) || 0,
                username: name,
                gid: primary,
                groups: Array.from(new Set([primary, ...supplementary])),
                home: home ?? '/',
                shell: shell ?? '/bin/sh',
                realName: (gecos ?? '').split(',')[0],
            } as User;
        });
    }

    groups(): Group[] {
        const text = this.read('/etc/group');
        if (text === null) return UserDatabase.fallback.getAllGroups();
        return text.split('\n').filter(l => l && !l.startsWith('#')).map(line => {
            const [groupname, , gid, members] = line.split(':');
            return {
                gid: parseInt(gid, 10) || 0,
                groupname: groupname ?? '',
                members: (members ?? '').split(',').filter(Boolean),
            } as Group;
        });
    }

    byUid(uid: number): User | undefined {
        return this.users().find(u => u.uid === uid);
    }

    byName(name: string): User | undefined {
        return this.users().find(u => u.username === name);
    }

    groupByGid(gid: number): Group | undefined {
        return this.groups().find(g => g.gid === gid);
    }

    groupByName(name: string): Group | undefined {
        return this.groups().find(g => g.groupname === name);
    }

    /** User name for display, or the numeric id when unknown (like ls). */
    userName(uid: number): string {
        return this.byUid(uid)?.username ?? String(uid);
    }

    groupName(gid: number): string {
        return this.groupByGid(gid)?.groupname ?? String(gid);
    }
}
