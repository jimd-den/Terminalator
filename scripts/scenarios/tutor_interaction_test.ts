import { TestUser } from '../framework/TestUser';

/**
 * Tutor E2E Simulation
 * 
 * Verifies the Tutor's interaction loop:
 * 1. Start mission.
 * 2. Tutor prompts.
 * 3. User types correct/incorrect.
 * 4. Tutor verifies or corrects.
 * 
 * Focus: Data/Tutor alignment.
 */

async function runScenario() {
    console.log("=== SCENARIO: TUTOR INTERACTION DEBUG ===");
    
    const user = new TestUser();

    // 1. Trigger Mission
    console.log("\n[STORY] Incoming transmission...");
    const gameManager = user.getGameManager();
    const mission = gameManager.spawnNPCEvent();
    
    if (!mission) {
        throw new Error("Failed to spawn mission");
    }
    
    console.log(`[MISSION] Type: ${mission.type} | Target: ${mission.targetSystem}`);

    // Simulate User Acceptance (Start Mission)
    console.log("\n[ACTION] Accepting mission...");
    gameManager.startMission(mission.id, user.getState());

    // Verify Tutor started a lesson for this mission
    const engine = gameManager.tutorEngine;
    if (!engine.isActive()) {
        throw new Error("Tutor Engine did not start automatically.");
    }
    
    const lesson = engine.getCurrentLesson();
    console.log(`[LESSON] Text: "${lesson?.text}"`);
    console.log(`[LESSON] Instructions: "${lesson?.instructions}"`);

    // Verify Lesson Data matches Mission Data
    // The lesson text (e.g. "ssh admin@host") should match the mission target.
    
    if (!lesson?.text.includes(mission.targetSystem)) {
        console.error(`[FAIL] Lesson text mismatch. Expected to contain ${mission.targetSystem}`);
        console.error(`[FAIL] Got: ${lesson?.text}`);
        process.exit(1);
    }
    console.log("[PASS] Tutor Lesson matches Mission Data.");

    // Simulate User Typing (Rhythm Game Logic)
    console.log("\n[ACTION] Simulating typing...");
    
    // 1. Correct Input
    const correctInput = lesson?.text || '';
    for (let i = 0; i < correctInput.length; i++) {
        const char = correctInput[i];
        engine.handleInput(char);
    }
    
    // Verify completion
    if (engine.isActive()) {
        console.error("[FAIL] Tutor did not complete after correct input.");
        process.exit(1);
    }
    console.log("[PASS] Tutor completed lesson.");

    // 2. Mission Progression
    // Completing the typing lesson should execute the command?
    // In the real game, the *input* goes to the shell after typing.
    // The `TutorEngine` is just an overlay.
    // So we must now EXECUTE the command to progress state.
    
    console.log(`\n[ACTION] Executing command: ${correctInput}`);
    await user.exec(correctInput);

    // 3. Verify Next Step
    // After SSH, we should get a NEW lesson (e.g. "ls" or "grep").
    
    // Small delay for async state updates
    await new Promise(r => setTimeout(r, 250));

    if (!engine.isActive()) {
        console.warn("[WARN] Tutor did not start next lesson immediately. Checking state...");
        // This might happen if the strategy needs a specific trigger or time delay.
        // Or if the mission state didn't update.
        const updatedMission = gameManager.getActiveMissions().find(m => m.id === mission.id);
        console.log(`[INFO] Mission Step: ${updatedMission?.currentStep}`);
    } else {
        const nextLesson = engine.getCurrentLesson();
        console.log(`[LESSON 2] Text: "${nextLesson?.text}"`);
        console.log(`[LESSON 2] Instructions: "${nextLesson?.instructions}"`);
        
        // Verify context awareness
        // If we are on remote, lesson should make sense for remote.
        const state = user.getState();
        if (state.fsContext === mission.targetSystem) {
            console.log("[PASS] Context is Remote.");
        } else {
            console.error(`[FAIL] Context is ${state.fsContext}, expected ${mission.targetSystem}`);
        }
    }

    console.log("=== SCENARIO COMPLETE ===");
}

runScenario().catch(e => {
    console.error(e);
    process.exit(1);
});
