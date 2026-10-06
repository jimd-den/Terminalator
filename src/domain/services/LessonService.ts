import { FileSystem } from '../entities/FileSystem';
import { FileSystemService } from './FileSystemService';
import { Lesson } from '../entities/TutorEngine';
import { CoreCommandGenerator } from './tutor/CoreCommandGenerator';

/**
 * LessonService - Domain Service
 * 
 * Manages the curriculum and initialization of Tutor lessons.
 * Decouples the pure TutorEngine entity from FileSystem dependencies.
 */
export class LessonService {
    private generator: CoreCommandGenerator;

    constructor() {
        this.generator = new CoreCommandGenerator();
    }

    private curriculum: Lesson[] = [
        {
            id: 'LESSON_01',
            type: 'SHELL',
            text: 'grep "Urgent" mail.log',
            instructions: 'TYPE THE FOLLOWING COMMAND TO FILTER LOGS:',
            setup: (fs: FileSystem) => {
                const service = new FileSystemService(fs);
                service.writeFile('/home/operator/mail.log', 'Info: Normal operation\nWarning: Disk space low\nUrgent: Security breach detected\nInfo: Service started');
            }
        },
        {
            id: 'LESSON_02',
            type: 'SHELL',
            text: 'cd /var/secure/data',
            instructions: 'NAVIGATE TO SECURE STORAGE:',
            setup: (fs: FileSystem) => {
                const service = new FileSystemService(fs);
                service.createDirectory('/var/secure/data');
            }
        },
        {
            id: 'LESSON_03',
            type: 'SHELL',
            text: 'vim secret.txt',
            instructions: 'OPEN THE FILE IN VIM:',
            setup: (fs: FileSystem) => {
                const service = new FileSystemService(fs);
                service.writeFile('/home/operator/secret.txt', 'This is a top secret file.');
            }
        }
    ];

    /**
     * Retrieves a lesson by ID.
     */
    getLesson(id: string): Lesson | undefined {
        return this.curriculum.find(l => l.id === id);
    }

    /**
     * Prepares the file system for a specific lesson.
     */
    setupLesson(lesson: Lesson, fs: FileSystem): boolean {
        if (!lesson.setup) return true;

        try {
            lesson.setup(fs);
            return true;
        } catch (error: any) {
            console.error(`LessonService: Setup failed for ${lesson.id}:`, error.message);
            return false;
        }
    }

    /**
     * Generates a dynamic lesson using the CoreCommandGenerator.
     */
    generateDynamicLesson(type: string): Lesson {
        // Map abstract types to command types if needed, or pass undefined for random
        return this.generator.generate();
    }
}
