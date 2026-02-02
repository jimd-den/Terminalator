
interface HintableMission {
    status: string;
    currentStep: string;
}

/**
 * HintService - Domain Layer
 * 
 * Provides contextual hints to the user during gameplay.
 * Encourages exploration and progression based on current state.
 *
 * Pillar: The Master's Tool (Pragmatic Strategy)
 * Pillar: Performance & Purity (Pure state-to-string mapping)
 */
export class HintService {
    /**
     * Determines the most appropriate hint based on current state.
     */
    public getHint(
        activeMissions: HintableMission[],
        isTutorActive: boolean,
        hasFsContext: boolean
    ): string | null {
        // If tutor is active, don't distract
        if (isTutorActive) return null;

        // Default hint
        let hint = "[ HINT: TYPE 'help' FOR AVAILABLE COMMANDS ]";

        // Find the active mission
        const activeMission = activeMissions.find(m => m.status === 'active');

        if (activeMission) {
            // Contextual hints based on mission progress
            switch (activeMission.currentStep) {
                case 'PENDING':
                    hint = "[ HINT: ESTABLISH CONNECTION TO TARGET SYSTEM ]";
                    break;
                case 'CONNECTED':
                    hint = "[ HINT: EXPLORE REMOTE DIRECTORY WITH 'ls' ]";
                    break;
                case 'LOCATED':
                    hint = "[ HINT: ACQUIRE OBJECTIVE FILE ]";
                    break;
                default:
                    hint = "[ HINT: COMPLETE CURRENT MISSION OBJECTIVE ]";
            }
        } else if (!hasFsContext) {
            // General guidance for local session
            hint = "[ HINT: CHECK 'mail' OR 'jobs' FOR ASSIGNMENTS ]";
        }

        return hint;
    }
}
