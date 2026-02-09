import { CoreEngine } from '../src/core/CoreEngine';
import { GameEventType } from '../src/domain/services/SimulationBus';

async function verifyRhythmRewards() {
    console.log("Starting Verification: Rhythm Rewards & Tutor Guidance...");

    const engine = CoreEngine.getInstance();
    await engine.initialize();
    
    const bus = engine.getSimulationBus();
    const conductor = engine.getConductor();
    const economy = engine.getEconomyService();
    const shadow = engine.getTutorShadow();
    const gameManager = engine.getGameManager();

    // 1. Setup Tutor Session
    const lesson = {
        id: 'TEST_RHYTHM',
        text: 'hello',
        type: 'SHELL' as const,
        instructions: 'Type HELLO on the beat'
    };
    
    console.log("Starting lesson...");
    gameManager.tutorEngine.startLesson(lesson);
    conductor.start(120); // 500ms intervals

    let tickReceived = false;
    bus.subscribe(GameEventType.TUTOR_EVENT, (event) => {
        const data = event.payload;
        if (data && data.type === 'RHYTHM_TICK') {
            console.log("Tick #" + data.payload.tick + " received at " + data.payload.timestamp);
            tickReceived = true;
        }
    });

    // 2. Wait for a tick and hit immediately
    console.log("Waiting for next tick to hit on-beat...");
    while(!tickReceived) {
        await new Promise(resolve => setTimeout(resolve, 10));
    }

    console.log("Simulating ON-BEAT hit...");
    const allowed = shadow.intercept('h', 'SHELL');
    console.log("Shadow Allowed: " + allowed);
    
    const session = economy.getSession();
    console.log("Current Streak: " + session.streak);
    if (session.streak === 0) throw new Error("On-beat hit was not rewarded");

    // 3. Simulate Off-Beat Hit (wait 250ms after next tick)
    tickReceived = false;
    console.log("Waiting for next tick...");
    while(!tickReceived) {
        await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    await new Promise(resolve => setTimeout(resolve, 250));
    console.log("Simulating OFF-BEAT hit...");
    shadow.intercept('e', 'SHELL');
    console.log("Current Streak after off-beat: " + session.streak);
    
    if (session.streak !== 0) throw new Error("Off-beat hit should have broken the streak");

    conductor.stop();
    engine.shutdown();
    console.log("\nVERIFICATION COMPLETED");
}

verifyRhythmRewards()
    .then(() => process.exit(0))
    .catch((e) => {
        console.error("\nVERIFICATION FAILED: " + e);
        process.exit(1);
    });
