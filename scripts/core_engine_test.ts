import { CoreEngine } from '../src/core/CoreEngine';

async function testCoreEngineInitialization() {
    console.log("Testing CoreEngine initialization...");
    
    // @ts-ignore
    const engine = CoreEngine.getInstance();
    
    // @ts-ignore
    if (engine.isInitialized()) {
        throw new Error("CoreEngine should not be initialized before initialize() call");
    }
    
    // @ts-ignore
    await engine.initialize();
    
    // @ts-ignore
    if (!engine.isInitialized()) {
        throw new Error("CoreEngine should be initialized after initialize() call");
    }
    
    // @ts-ignore
    if (!engine.getFileSystem()) throw new Error("FileSystem missing");
    // @ts-ignore
    if (!engine.getEconomyService()) throw new Error("EconomyService missing");
    // @ts-ignore
    if (!engine.getTutorBrain()) throw new Error("TutorBrain missing");
    // @ts-ignore
    if (!engine.getMasteryTracker()) throw new Error("MasteryTracker missing");
    // @ts-ignore
    if (!engine.getGameManager()) throw new Error("GameManager missing");
    // @ts-ignore
    if (!engine.getCommandExecutor()) throw new Error("CommandExecutor missing");
    // @ts-ignore
    if (!engine.getTutorShadow()) throw new Error("TutorShadow missing");
    // @ts-ignore
    if (!engine.getSimulationBus()) throw new Error("SimulationBus missing");
    // @ts-ignore
    if (!engine.getTutorMessaging()) throw new Error("TutorMessaging missing");

    console.log("Services verified.");

    // CLEANUP
    // @ts-ignore
    engine.shutdown();
    console.log("Engine shutdown.");

    console.log("PASS");
}

testCoreEngineInitialization()
    .then(() => {
        console.log("\nCORE ENGINE TESTS PASSED");
        process.exit(0);
    })
    .catch((e) => {
        console.error("\nTEST FAILED: " + e);
        process.exit(1);
    });