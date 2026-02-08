import { MissionStep } from "../entities/Mission";

export interface TutorAction {
    missionId: string;
    message: string;
    type: 'HINT' | 'WARNING' | 'CONGRATS';
    confidence: number; // 0-1
    severity?: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';
}

export interface TutorProgressionResult {
    type: 'START_LESSON' | 'STEP_COMPLETE' | 'MISSION_COMPLETE';
    message?: string;      // [NEW] Narrative feedback for progression
    lessonId?: string;
    objectiveTarget?: string;
    nextStep?: MissionStep;
    nextStepId?: string;   // [NEW] For generative missions
    text?: string;        // [NEW] Dynamic command for the lesson
    instructions?: string; // [NEW] Narrative instructions
    isMission?: boolean;   // [NEW] Carry mission context
}
