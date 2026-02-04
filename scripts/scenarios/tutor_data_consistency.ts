import { TestUser } from '../framework/TestUser';

/**
 * Tutor vs Data Consistency Test
 * 
 * Verifies that the Tutor's suggestions align with the procedurally generated data.
 * Specifically checks the "Grep" step where the user is told to grep for a value.
 * The value suggested by the Tutor MUST exist in the target file.
 * 
 * Flow:
 * 1. Start Knuthian Mission (Search/Sort).
 * 2. Connect.
 * 3. Receive Grep Lesson.
 * 4. Verify the pattern in the lesson actually yields results in the file.
 */

async function runScenario() {
    console.log("=== SCENARIO: TUTOR DATA CONSISTENCY DEBUG ===");
    
    const user = new TestUser();
    const gameManager = user.getGameManager();
    const engine = gameManager.tutorEngine;

    // 1. Trigger Mission
    console.log("\n[STORY] Incoming transmission...");
    const mission = gameManager.spawnNPCEvent();
    if (!mission) throw new Error("Failed to spawn mission");
    
    console.log(`[MISSION] Type: ${mission.type} | Target: ${mission.targetSystem}`);
    console.log(`[OBJECTIVE] ${mission.objectiveTarget}`);

    // 2. Accept & Connect
    gameManager.startMission(mission.id, user.getState());
    await user.exec(`ssh admin@${mission.targetSystem}`);

    // 3. Fast-Forward to Grep Step
    // Current flow: PENDING (SSH) -> CONNECTED (Grep) -> LOCATED (Fix)
    // We are now CONNECTED.
    // Tutor should be showing the Grep lesson.
    
    await new Promise(r => setTimeout(r, 250)); // Wait for Tutor
    const lesson = engine.getCurrentLesson();
    
    if (!lesson) {
        console.error("FAILED: No lesson active after connection.");
        process.exit(1);
    }

    console.log(`[LESSON] Text: "${lesson.text}"`);
    console.log(`[LESSON] Instructions: "${lesson.instructions}"`);

    // 4. Extract Grep Pattern
    // Lesson text should be: `grep "PATTERN" file`
    // We need to parse this to verify the pattern exists.
    
    const match = lesson.text.match(/grep \"([^\"]+)\" (.*)/);
    if (!match) {
        // Might be using single quotes or no quotes
        // Or it might be a CD lesson if we are in wrong dir.
        if (lesson.text.startsWith('cd')) {
            console.log("[INFO] Navigation lesson detected. Executing...");
            await user.exec(lesson.text);
            await new Promise(r => setTimeout(r, 250));
            // Recurse/Retry logic in real test, but for linear debug:
            const nextLesson = engine.getCurrentLesson();
            console.log(`[NEXT LESSON] "${nextLesson?.text}"`);
            
            // Re-evaluate regex on next lesson
            const nextMatch = nextLesson?.text.match(/grep \"([^\"]+)\" (.*)/);
            if (!nextMatch) {
                console.error("FAILED: Expected grep lesson after navigation.");
                process.exit(1);
            }
            verifyGrep(user, nextMatch[1], nextMatch[2]);
        } else {
            console.error(`FAILED: Lesson text '${lesson.text}' does not match expected grep pattern.`);
            process.exit(1);
        }
    } else {
        await verifyGrep(user, match[1], match[2]);
    }

    console.log("=== SCENARIO COMPLETE ===");
}

async function verifyGrep(user: TestUser, pattern: string, file: string) {
    console.log(`\n[DEBUG] Contents of /var/log:`);
    await user.exec("ls -la /var/log");

    console.log(`\n[VERIFY] Checking if pattern '${pattern}' exists in '${file}'...`);
    
    const res = await user.exec(`grep "${pattern}" ${file}`);
    
    if (res.exitCode === 0) {
        console.log("[PASS] Grep successful. Tutor is guiding correctly.");
    } else {
        console.error("[FAIL] Grep failed. Tutor suggested a pattern that does not exist.");
        console.error("[DEBUG] File content snippet:");
        await user.exec(`head -n 5 ${file}`);
        process.exit(1);
    }
}

runScenario().catch(e => {
    console.error(e);
    process.exit(1);
});
