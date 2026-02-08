import { CoreEngine } from '../src/core/CoreEngine';
import { GameEventType } from '../src/domain/services/SimulationBus';

async function verifyInputLifecycle() {
    console.log("Starting Verification: Input Lifecycle...");

    const engine = CoreEngine.getInstance();
    await engine.initialize();
    const bus = engine.getSimulationBus();

    console.log("Simulating THEATRE_ACTIVE...");
    bus.emit(GameEventType.TUTOR_EVENT, { type: 'THEATRE_ACTIVE' });
    console.log("Event THEATRE_ACTIVE emitted.");

    console.log("Simulating THEATRE_COMPLETE...");
    bus.emit(GameEventType.TUTOR_EVENT, { type: 'THEATRE_COMPLETE' });
    console.log("Event THEATRE_COMPLETE emitted.");

    engine.shutdown();
    console.log("\nVERIFICATION COMPLETED");
}

verifyInputLifecycle()
    .then(() => process.exit(0))
    .catch((e) => {
        console.error("\nVERIFICATION FAILED: " + e);
        process.exit(1);
    });