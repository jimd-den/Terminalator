
import { TerminalState, createInitialTerminalState } from '../src/domain/entities/TerminalState';
import { Mission, MissionStep } from '../src/domain/entities/Mission';
import { TutorService } from '../src/domain/services/TutorService';
import { MissionRepository } from '../src/domain/services/MissionRepository';
import { LessonRegistry } from '../src/domain/services/LessonRegistry';
import { NPC } from '../src/domain/entities/NPC';
import { JsonMissionDataProvider } from '../src/infrastructure/data/JsonMissionDataProvider';
import { StrategyRegistry } from '../src/domain/services/mission-strategies/StrategyRegistry';

/**
 * MISSION TESTER
 * Simulates a full mission lifecycle to verify data-driven progression and navigation support.
 */

async function runTest() {
    console.log("--- MISSION TESTER STARTING ---");

    const repo = new MissionRepository(new JsonMissionDataProvider());
    const registry = new LessonRegistry();
    const strategyRegistry = new StrategyRegistry();
    const tutor = new TutorService(repo, registry, strategyRegistry);

    const npc: NPC = {
        id: 'test-npc',
        name: 'Test NPC',
        origin: 'Station One',
        career: 'SysAdmin',
        loadout: [],
        goal: 'Testing',
        status: 'active',
        traits: []
    };

    // Testing 'log-analysis'
    console.log("\n[TEST] Archetype: log-analysis");
    const variables = {
        targetSystem: 'web-server-01',
        objectiveTarget: 'REQ-5512'
    };
    const mission = repo.createMissionFromTemplate('log-analysis', npc, variables);
    mission.status = 'active';

    let state: TerminalState = createInitialTerminalState();
    state.fsContext = 'localhost';

    // 1. Initial State (Locked at SSH)
    let evaluation = tutor.checkMissionProgression(state, [mission]);
    console.log("Initial state (should be null or hint to SSH):", evaluation?.result?.text || "No lesson yet");

    // 2. SSH Success
    state.fsContext = mission.targetSystem;
    evaluation = tutor.checkMissionProgression(state, [mission], { command: 'ssh admin@web-server-01', output: 'Welcome', exitCode: 0, newState: state } as any);

    console.log("After SSH (should be 'cd /var/log/httpd' if in wrong dir):", evaluation?.result?.text);

    if (evaluation?.result?.text?.startsWith('cd')) {
        console.log("PASSED: Tutor detected wrong CWD and suggested navigation.");
        state.currentDirectory = '/var/log/httpd'; // Simulate user moving

        // Re-check after CD
        evaluation = tutor.checkMissionProgression(state, [mission]);
        console.log("After CD (should be 'grep \"500\" access.log'):", evaluation?.result?.text);

        if (evaluation?.result?.text?.includes('grep')) {
            console.log("PASSED: Tutor suggested the objective command after navigation.");

            // Advance mission step manually as strategy would
            mission.currentStep = MissionStep.CONNECTED;

            // Simulate GREP success
            const grepResponse = {
                command: 'grep "500" access.log',
                output: '... REQ-5512 500 error ...',
                exitCode: 0,
                newState: state
            };
            evaluation = tutor.checkMissionProgression(state, [mission], grepResponse as any);
            console.log("After GREP (should be 'vim' to fix):", evaluation?.result?.text);

            if (evaluation?.result?.text?.includes('vim')) {
                console.log("PASSED: Mission progressed to repair step.");
            } else {
                console.error("FAILED: Mission did not progress after grep.");
            }
        } else {
            console.error("FAILED: Tutor did not suggest grep after navigation.");
        }
    } else {
        console.error("FAILED: Tutor did not suggest navigation.");
    }

    console.log("\n--- MISSION TESTER COMPLETED ---");
}

runTest().catch(console.error);
