import { MissionStep } from "../entities/Mission";

export interface TutorAction {
    message: string;
    type: 'HINT' | 'WARNING' | 'CONGRATS';
    confidence: number; // 0-1
}

export interface TutorProgressionResult {
    type: 'START_LESSON';
    lessonId: string;
    objectiveTarget?: string;
    nextStep?: MissionStep;
    text?: string;        // [NEW] Dynamic command for the lesson
    instructions?: string; // [NEW] Narrative instructions
    isMission?: boolean;   // [NEW] Carry mission context
}
