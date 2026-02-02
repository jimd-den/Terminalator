import LessonCatalog from '../data/LessonCatalog.json';
import { Lesson } from '../entities/TutorEngine';

/**
 * LessonRegistry - Domain Service
 * 
 * Manages access to tutor lessons and narrative dialogue.
 * 
 * Pillar: The Storyteller's Code (Narrative Integration)
 * Pillar: The Master's Tool (Technical Excellence)
 */
export class LessonRegistry {
    private catalog = LessonCatalog;

    public getLessonTemplate(lessonId: string): { text: string; instructions: string } | null {
        return (this.catalog as any).lessons?.[lessonId] || null;
    }

    public getDialogue(key: string): string {
        const parts = key.split('.');
        let current: any = this.catalog.operator_dialogue;
        for (const part of parts) {
            if (current[part]) current = current[part];
            else return '';
        }
        return typeof current === 'string' ? current : '';
    }

    public createLesson(id: string, variables: Record<string, string>): Lesson {
        const template = this.getLessonTemplate(id);

        let text = template?.text || 'ls -la';
        let instructions = template?.instructions || 'SCAN SYSTEM';

        // Inject variables
        const injector = (str: string) => str.replace(/\{\{(\w+)\}\}/g, (_, k) => variables[k] || `{{${k}}}`);

        return {
            id,
            type: 'SHELL',
            text: injector(text),
            instructions: injector(instructions)
        };
    }
}
