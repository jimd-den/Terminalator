import { Mission } from '../../entities/Mission';
import { TerminalState } from '../../entities/TerminalState';
import { TutorProgressionResult } from '../TutorService';

export class StrategyUtils {
    /**
     * Intercepts progression if the user is in the wrong directory.
     * Returns a CD lesson instead of the intended command lesson.
     */
    public static handleNavigation(mission: Mission, state: TerminalState, targetCwd: string | undefined): TutorProgressionResult | null {
        if (targetCwd && state.currentDirectory !== targetCwd) {
            return {
                type: 'START_LESSON',
                lessonId: `NAV_${mission.id}`,
                text: `cd ${targetCwd}`,
                instructions: `CONTEXT ERROR: INCORRECT WORKING DIRECTORY. NAVIGATE TO ${targetCwd}.`,
                isMission: true
            };
        }
        return null;
    }
}
