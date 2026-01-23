/**
 * TutorCommand - Interface Adapter Layer
 * 
 * Command to start the typing tutor lessons.
 * Usage: tutor [lesson_id]
 */

import { ICommand, CommandResponse } from '../../../domain/commands/ICommand';
import { GameManager } from '../../GameManager';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../../domain/entities/TerminalState';

export class TutorCommand implements ICommand {
    constructor(private gameManager: GameManager) { }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const input = context.stdin;
        const lessonId = args[0] || 'LESSON_01'; // Default to first lesson

        const success = this.gameManager.tutorEngine.startLesson(lessonId, context.fs);

        if (success) {
            return {
                output: `TUTOR PROTOCOL INITIATED: ${lessonId}\nFollow instructions from TutorBot.`,
                newState: state,
                exitCode: 0
            };
        } else {
            return {
                output: `ERROR: Lesson '${lessonId}' not found.\nAvailable: LESSON_01, LESSON_02, LESSON_03`,
                newState: state,
                exitCode: 1
            };
        }
    }
}
