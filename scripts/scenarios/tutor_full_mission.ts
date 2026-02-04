import { TestUser } from '../framework/TestUser';

/**
 * Tutor E2E Simulation - Full Completion
 * 
 * Verifies the Tutor leads the player from start to finish.
 * 
 * Flow:
 * 1. Accept Mission (SSH Lesson)
 * 2. Complete SSH Lesson -> Exec SSH
 * 3. Receive Next Lesson (e.g. CD or GREP) -> Complete -> Exec
 * 4. Receive Final Lesson (e.g. VIM) -> Complete -> Exec
 * 5. Verify Mission Complete
 */

async function runScenario() {
    console.log("=== SCENARIO: TUTOR FULL COMPLETION DEBUG ===");
    
    const user = new TestUser();
    const gameManager = user.getGameManager();
    const engine = gameManager.tutorEngine;

    // 1. Trigger Mission
    console.log("\n[STORY] Incoming transmission...");
    const mission = gameManager.spawnNPCEvent();
    
    if (!mission) throw new Error("Failed to spawn mission");
    
    console.log(`[MISSION] Type: ${mission.type} | Target: ${mission.targetSystem}`);

    // Simulate User Acceptance
    console.log("\n[ACTION] Accepting mission...");
    gameManager.startMission(mission.id, user.getState());

    // Loop until completion or max steps
    let steps = 0;
    const MAX_STEPS = 10;

    while (mission.status !== 'completed' && steps < MAX_STEPS) {
        steps++;
        
        // Wait for Tutor to catch up (async state)
        // GameManager has a 200ms delay before starting the next lesson.
        await new Promise(r => setTimeout(r, 300));

        if (!engine.isActive()) {
            console.log("[INFO] Tutor idle. Checking mission status...");
            const updated = gameManager.getActiveMissions().find(m => m.id === mission.id);
            if (updated?.status === 'completed') break;
            
            // If not complete and tutor idle, something is wrong or we need to trigger an update?
            // Usually commands trigger updates.
            // Let's look at the chat history for hints.
            console.log("Last Chat:", updated?.chatHistory.slice(-1)[0]?.message);
            break;
        }

        const lesson = engine.getCurrentLesson();
        console.log(`\n[STEP ${steps}] Lesson: "${lesson?.text}"`);
        console.log(`[STEP ${steps}] Instructions: "${lesson?.instructions}"`);

        // Simulate Typing
        const input = lesson?.text || '';
        for (let i = 0; i < input.length; i++) engine.handleInput(input[i]);

        // Execute Command
        console.log(`[ACTION] Executing: ${input}`);
        await user.exec(input);
    }

    const finalMission = gameManager.getActiveMissions().find(m => m.id === mission.id);
    if (finalMission?.status === 'completed') {
        console.log("\n[SUCCESS] Mission Completed via Tutor Guidance!");
    } else {
        console.error(`\n[FAIL] Mission stuck at step: ${finalMission?.currentStep}`);
        process.exit(1);
    }

    console.log("=== SCENARIO COMPLETE ===");
}

runScenario().catch(e => {
    console.error(e);
    process.exit(1);
});
