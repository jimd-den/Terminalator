import { TestUser } from '../framework/TestUser';

/**
 * Grep Missing File Simulation
 * 
 * Replicates the user report:
 * 1. Start mission.
 * 2. Connect to remote.
 * 3. `grep` for target file.
 * 4. Verify failure if file is missing.
 */

async function runScenario() {
    console.log("=== SCENARIO: GREP MISSING FILE DEBUG ===");
    
    const user = new TestUser();

    // 1. Trigger Mission
    console.log("\n[STORY] Incoming transmission...");
    const gameManager = user.getGameManager();
    const mission = gameManager.spawnNPCEvent();
    
    if (!mission) {
        throw new Error("Failed to spawn mission");
    }
    
    console.log(`[MISSION] Type: ${mission.type} | Target: ${mission.targetSystem}`);
    console.log(`[OBJECTIVE] ${mission.objectiveTarget}`);

    // 3. Connect
    await user.exec(`ssh admin@${mission.targetSystem}`);

    // 4. Attempt Grep (The reported failure)
    // The user reports grep fails.
    // Logic: The file `mission.objectiveTarget` SHOULD exist on the remote.
    // Does WorldManager create it?
    
    console.log("\n[ACTION] Attempting grep...");
    const grepCmd = `grep "500" /var/log/${mission.objectiveTarget}`;
    const res = await user.exec(grepCmd);
    
    if (res.exitCode !== 0) {
        console.error(`[FAIL] Grep failed with code ${res.exitCode}`);
        console.error(`[DEBUG] File system content of /var/log:`);
        await user.exec("ls -l /var/log");
    } else {
        console.log("[SUCCESS] Grep found the file.");
    }

    // 7. Disconnect
    await user.exec("exit");
    
    console.log("=== SCENARIO COMPLETE ===");
}

runScenario().catch(e => {
    console.error(e);
    process.exit(1);
});
