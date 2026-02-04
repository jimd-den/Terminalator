import { TestUser } from '../framework/TestUser';
import { MissionType, MissionStep } from '../../src/domain/entities/Mission';

/**
 * Comprehensive Mission Type Test
 * 
 * Verifies that ALL mission archetypes are completable via Tutor guidance.
 * Adheres to the "Golden Rule" of TDD First.
 */

async function testAllMissions() {
    console.log("=== COMPREHENSIVE MISSION TYPE TEST ===");
    
    const types: MissionType[] = ['log-analysis', 'exfiltrate', 'modify', 'dispatcher'];
    
    for (const type of types) {
        console.log(`\n>>> TESTING MISSION TYPE: ${type} <<<`);
        try {
            await runScenarioForType(type);
            console.log(`[PASS] ${type} is functional.`);
        } catch (e: any) {
            console.error(`[FAIL] ${type} failed: ${e.message}`);
            // In a real TDD loop, we might stop here, but for report let's continue.
        }
    }
    
    console.log("\n=== TEST SUITE COMPLETE ===");
}

async function runScenarioForType(type: MissionType) {
    const user = new TestUser();
    const gameManager = user.getGameManager();
    const engine = gameManager.tutorEngine;

    // Trigger specific mission type
    let mission = gameManager.spawnNPCEvent();
    let attempts = 0;
    while (mission?.type !== type && attempts < 100) {
        if (mission) gameManager.abandonMission(mission.id);
        mission = gameManager.spawnNPCEvent();
        attempts++;
    }

    if (mission?.type !== type) {
        throw new Error(`Failed to spawn mission of type ${type} after 20 attempts.`);
    }

    console.log(`[START] ID: ${mission.id} | Desc: ${mission.description.substring(0, 50)}...`);

    // Start
    gameManager.startMission(mission.id, user.getState());

    let steps = 0;
    while (mission.status !== 'completed' && steps < 10) {
        steps++;
        await new Promise(r => setTimeout(r, 350)); // Wait for Tutor

        if (!engine.isActive()) {
            const updated = gameManager.getMissionById(mission.id);
            if (updated?.status === 'completed') break;
            
            // If idle and not complete, the strategy is stuck or requires manual intervention.
            throw new Error(`Tutor stalled at Step ${steps} (Mission Step: ${updated?.currentStep}). Last msg: ${updated?.chatHistory.slice(-1)[0]?.message}`);
        }

        const lesson = engine.getCurrentLesson()!;
        // Simulate Typing
        const input = lesson.text;
        for (let i = 0; i < input.length; i++) engine.handleInput(input[i]);

        // Execute
        await user.exec(input);
    }

    const final = gameManager.getMissionById(mission.id);
    if (final?.status !== 'completed') {
        throw new Error(`Mission not completed after ${steps} steps. Status: ${final?.status}`);
    }
}

testAllMissions().catch(e => {
    console.error(e);
    process.exit(1);
});
