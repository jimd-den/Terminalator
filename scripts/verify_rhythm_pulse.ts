import { RhythmConductor } from '../src/domain/services/RhythmConductor';
import { SimulationBus, GameEventType } from '../src/domain/services/SimulationBus';
import { ConsoleTelemetryAdapter } from '../src/infrastructure/telemetry/ConsoleTelemetryAdapter';

async function verifyRhythmPulse() {
    console.log("Starting Verification: Rhythm Heartbeat Pulse...");

    const telemetry = new ConsoleTelemetryAdapter();
    const bus = new SimulationBus(telemetry);
    const conductor = new RhythmConductor(bus);

    bus.subscribe(GameEventType.TUTOR_EVENT, (event) => {
        // Correct property access: event is GameEvent, event.payload is the data from emit
        const data = event.payload;
        if (data && data.type === 'RHYTHM_TICK') {
            const { tick, timestamp } = data.payload;
            console.log("[" + new Date(timestamp).toISOString() + "] RHYTHM_TICK #" + tick);
        }
    });

    console.log("Starting pulse at 120 BPM for 3 seconds...");
    conductor.start(120);

    await new Promise(resolve => setTimeout(resolve, 3000));

    conductor.stop();
    console.log("\nPulse stopped. VERIFICATION COMPLETED.");
}

verifyRhythmPulse()
    .then(() => process.exit(0))
    .catch((e) => {
        console.error("\nVERIFICATION FAILED: " + e);
        process.exit(1);
    });
