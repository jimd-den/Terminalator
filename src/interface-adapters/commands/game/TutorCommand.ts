/**
 * TutorCommand - Interface Adapter Layer
 * 
 * Command to start the typing tutor lessons.
 * Usage: tutor [lesson_id]
 */

import { ICommand } from '../../../domain/commands/ICommand';
import { CommandResult } from '../../../domain/entities/Command';
import { GameManager } from '../../GameManager';

export class TutorCommand implements ICommand {
    constructor(private gameManager: GameManager) { }

    execute(args: string[]): CommandResult {
        const lessonId = args[0] || 'LESSON_01'; // Default to first lesson

        const success = this.gameManager.tutorEngine.startLesson(lessonId);

        if (success) {
            return {
                output: `TUTOR PROTOCOL INITIATED: ${lessonId}\nFollow instructions from TutorBot.`,
                exitCode: 0
            };
        } else {
            return {
                output: `ERROR: Lesson '${lessonId}' not found.\nAvailable: LESSON_01, LESSON_02, LESSON_03`,
                exitCode: 1
            };
        }
    }
}
