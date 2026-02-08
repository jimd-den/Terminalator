import { CoreEngine } from '../src/core/CoreEngine';
import { GameEventType } from '../src/domain/services/SimulationBus';

async function verifyInputLock() {
    console.log("Starting Verification: Theatrical Input Lock...");

    const engine = CoreEngine.getInstance();
    await engine.initialize();
    const bus = engine.getSimulationBus();

    console.log("Simulating PRESENTATION_START...");
    bus.emit(GameEventType.TUTOR_EVENT, { type: 'PRESENTATION_START', payload: { verb: 'SCAN' } });
    
    console.log("Event PRESENTATION_START emitted.");

    console.log("Simulating PRESENTATION_END...");
    bus.emit(GameEventType.TUTOR_EVENT, { type: 'PRESENTATION_END', payload: {} });
    console.log("Event PRESENTATION_END emitted.");

    engine.shutdown();
    console.log("\nVERIFICATION COMPLETED");
}

verifyInputLock()
    .then(() => process.exit(0))
    .catch((e) => {
        console.error("\nVERIFICATION FAILED: " + e);
        process.exit(1);
    });