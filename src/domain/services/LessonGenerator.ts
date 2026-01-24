/**
 * LessonGenerator - Domain Service
 * 
 * Generates dynamic, solvable lessons for the Tutor Engine.
 * Focuses on "CLI Superpowers" - tasks where the terminal beats the GUI.
 * 
 * Pillar: The Four-Fold Shield (Service Layer)
 */

import { Lesson } from '../entities/TutorEngine';
import { FileSystem } from '../entities/FileSystem';
import { FileSystemService } from './FileSystemService';

export type LessonType = 'LOG_ANALYSIS' | 'BULK_ORG' | 'SCAFFOLDING' | 'CLEANUP';

export class LessonGenerator {
    static generate(type: LessonType): Lesson {
        switch (type) {
            case 'LOG_ANALYSIS': return this.generateLogAnalysis();
            case 'BULK_ORG': return this.generateBulkOrganization();
            case 'SCAFFOLDING': return this.generateScaffolding();
            case 'CLEANUP': return this.generateCleanup();
            default: return this.generateLogAnalysis();
        }
    }

    private static generateLogAnalysis(): Lesson {
        const id = `LOG_${Date.now()}`;
        return {
            id,
            type: 'SHELL',
            text: 'grep "500" access.log',
            instructions: 'FIND ALL SERVER ERRORS (STATUS 500) IN THE LOG:',
            setup: (fs: FileSystem) => {
                const service = new FileSystemService(fs);
                // Generate a realistic access log
                let content = '';
                const ips = ['192.168.1.10', '10.0.0.5', '172.16.0.23', '192.168.1.42'];
                const paths = ['/api/v1/auth', '/home', '/dashboard', '/api/v1/users', '/settings'];

                for (let i = 0; i < 50; i++) {
                    const ip = ips[Math.floor(Math.random() * ips.length)];
                    const path = paths[Math.floor(Math.random() * paths.length)];
                    const status = Math.random() > 0.8 ? 500 : 200;
                    const time = new Date(Date.now() - Math.floor(Math.random() * 10000000)).toISOString();
                    content += `${ip} - - [${time}] "GET ${path} HTTP/1.1" ${status} ${Math.floor(Math.random() * 5000)}\n`;
                }

                service.writeFile('/home/operator/access.log', content);
            }
        };
    }

    private static generateBulkOrganization(): Lesson {
        const id = `MV_${Date.now()}`;
        return {
            id,
            type: 'SHELL',
            text: 'mv *.png images/',
            instructions: 'MOVE ALL IMAGES TO THE IMAGES FOLDER AT ONCE:',
            setup: (fs: FileSystem) => {
                const service = new FileSystemService(fs);
                service.createDirectory('/home/operator/images');

                // Scatter some files
                const files = ['logo.png', 'banner.png', 'avatar.jpg', 'icon.png', 'readme.md', 'config.json', 'screenshot.png'];
                files.forEach(f => {
                    service.writeFile(`/home/operator/${f}`, '[BINARY DATA]');
                });
            }
        };
    }

    private static generateScaffolding(): Lesson {
        const id = `MKDIR_${Date.now()}`;
        return {
            id,
            type: 'SHELL',
            text: 'mkdir -p src/api/v1',
            instructions: 'CREATE A DEEP DIRECTORY STRUCTURE INSTANTLY:',
            setup: (fs: FileSystem) => {
                // Ensure root is clean-ish for this demo
                // user is already in /home/operator usually
            }
        };
    }

    private static generateCleanup(): Lesson {
        const id = `RM_${Date.now()}`;
        return {
            id,
            type: 'SHELL',
            text: 'rm *.tmp',
            instructions: 'CLEAN UP ALL TEMPORARY FILES WITH ONE COMMAND:',
            setup: (fs: FileSystem) => {
                const service = new FileSystemService(fs);
                // Create clutter
                for (let i = 0; i < 5; i++) {
                    service.writeFile(`/home/operator/temp_${i}.tmp`, 'trash');
                    service.writeFile(`/home/operator/cache_${i}.tmp`, 'garbage');
                }
                service.writeFile('/home/operator/important.doc', 'KEEP THIS');
            }
        };
    }
}
