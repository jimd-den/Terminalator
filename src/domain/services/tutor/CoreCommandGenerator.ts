/**
 * CoreCommandGenerator - Domain Service
 * 
 * Procedurally generates lessons for core Unix commands.
 * Handles strict setup requirements (e.g., ensuring a file exists before 'rm').
 * 
 * Pillar: THE MAKER'S ANVIL (Procedural Generation)
 */

import { FileSystem } from '../../entities/FileSystem';
import { FileSystemService } from '../FileSystemService';
import { Lesson } from '../../entities/TutorEngine';

type CommandType = 'mkdir' | 'touch' | 'rm' | 'cp' | 'mv' | 'ls' | 'cd';

export class CoreCommandGenerator {
    
    public generate(type?: CommandType): Lesson {
        const cmdType = type || this.getRandomType();
        const id = `CORE_${cmdType.toUpperCase()}_${Date.now().toString(36).substr(-4)}`;
        
        switch (cmdType) {
            case 'mkdir': return this.genMkdir(id);
            case 'touch': return this.genTouch(id);
            case 'rm': return this.genRm(id);
            case 'cp': return this.genCp(id);
            case 'mv': return this.genMv(id);
            case 'ls': return this.genLs(id);
            case 'cd': return this.genCd(id);
            default: return this.genLs(id);
        }
    }

    private getRandomType(): CommandType {
        const types: CommandType[] = ['mkdir', 'touch', 'rm', 'cp', 'mv', 'ls', 'cd'];
        return types[Math.floor(Math.random() * types.length)];
    }

    // --- Generators ---

    private genMkdir(id: string): Lesson {
        const target = `dir_${this.randId()}`;
        return {
            id,
            type: 'SHELL',
            text: `mkdir ${target}`,
            instructions: 'CREATE DIRECTORY:',
            setup: (fs: FileSystem) => {
                const service = new FileSystemService(fs);
                // Ensure it doesn't exist
                const existing = service.resolve(target);
                if (existing) service.deleteNode(target);
            }
        };
    }

    private genTouch(id: string): Lesson {
        const target = `file_${this.randId()}.txt`;
        return {
            id,
            type: 'SHELL',
            text: `touch ${target}`,
            instructions: 'CREATE EMPTY FILE:',
            setup: (fs: FileSystem) => {
                const service = new FileSystemService(fs);
                const existing = service.resolve(target);
                if (existing) service.deleteNode(target);
            }
        };
    }

    private genRm(id: string): Lesson {
        const target = `junk_${this.randId()}.tmp`;
        return {
            id,
            type: 'SHELL',
            text: `rm ${target}`,
            instructions: 'REMOVE FILE:',
            setup: (fs: FileSystem) => {
                const service = new FileSystemService(fs);
                service.writeFile(target, 'garbage content');
            }
        };
    }

    private genCp(id: string): Lesson {
        const src = `data_${this.randId()}.dat`;
        const dest = `backup_${this.randId()}.dat`;
        return {
            id,
            type: 'SHELL',
            text: `cp ${src} ${dest}`,
            instructions: 'BACKUP FILE:',
            setup: (fs: FileSystem) => {
                const service = new FileSystemService(fs);
                service.writeFile(src, 'crucial system data');
                // Ensure dest doesn't exist
                const existing = service.resolve(dest);
                if (existing) service.deleteNode(dest);
            }
        };
    }

    private genMv(id: string): Lesson {
        const src = `old_${this.randId()}.log`;
        const dest = `new_${this.randId()}.log`;
        return {
            id,
            type: 'SHELL',
            text: `mv ${src} ${dest}`,
            instructions: 'RENAME LOG FILE:',
            setup: (fs: FileSystem) => {
                const service = new FileSystemService(fs);
                service.writeFile(src, 'legacy logs');
                const existing = service.resolve(dest);
                if (existing) service.deleteNode(dest);
            }
        };
    }

    private genLs(id: string): Lesson {
        // Create a rich environment to list
        return {
            id,
            type: 'SHELL',
            text: 'ls -la',
            instructions: 'SCAN DIRECTORY:',
            setup: (fs: FileSystem) => {
                const service = new FileSystemService(fs);
                service.writeFile('config.sys', 'settings=true');
                service.createDirectory('logs');
                service.writeFile('logs/error.log', 'error');
            }
        };
    }

    private genCd(id: string): Lesson {
        const target = `sector_${this.randId()}`;
        return {
            id,
            type: 'SHELL',
            text: `cd ${target}`,
            instructions: 'NAVIGATE TO SECTOR:',
            setup: (fs: FileSystem) => {
                const service = new FileSystemService(fs);
                service.createDirectory(target);
            }
        };
    }

    private randId(): string {
        return Math.floor(Math.random() * 1000).toString();
    }
}
