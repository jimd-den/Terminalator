import { CoreEngine } from '../src/core/CoreEngine';
import { GameEventType } from '../src/domain/services/SimulationBus';
import { FileSystemService } from '../src/domain/services/FileSystemService';

async function runSmokeTest() {
    console.log("Starting Smoke Test: Granular Providers Persistence...");

    const engine = CoreEngine.getInstance();
    await engine.initialize();

    const economy = engine.getEconomyService();
    const bus = engine.getSimulationBus();
    const fs = engine.getFileSystem();
    const fsService = new FileSystemService(fs);

    // 1. Verify FileSystem Persistence
    console.log("Verifying FileSystem...");
    const testFile = '/tmp/smoke_test.txt';
    const content = 'SMOKE_TEST_PASSED';
    
    fsService.writeFile(testFile, content, 'w');
    
    const readBack = fsService.readFile(testFile);
    if (readBack !== content) throw new Error("FS Persistence Failure");
    console.log("FileSystem PASS");

    // 2. Verify Economy Updates
    console.log("Verifying Economy...");
    
    let eventReceived = false;
    bus.subscribe(GameEventType.ECONOMY_UPDATE, (event) => {
        console.log("Received Economy Update: " + event.payload.balance);
        eventReceived = true;
    });

    economy.recordHit(); // Should trigger update
    
    // Wait for event loop
    await new Promise(resolve => setTimeout(resolve, 100));
    
    if (!eventReceived) throw new Error("Economy Event Bus Failure");
    console.log("Economy PASS");

    // 3. Verify Tutor Messaging
    console.log("Verifying Tutor Messaging...");
    const messaging = engine.getTutorMessaging();
    await messaging.sendMessage("Smoke Test Message", "info");
    
    const msg = await messaging.getNextMessage();
    if (!msg || msg.text !== "Smoke Test Message") throw new Error("Messaging Failure");
    console.log("Messaging PASS");

    engine.shutdown();
    console.log("\nSMOKE TEST COMPLETED SUCCESSFULLY");
}

runSmokeTest()
    .then(() => process.exit(0))
    .catch((e) => {
        console.error("\nSMOKE TEST FAILED: " + e);
        process.exit(1);
    });
