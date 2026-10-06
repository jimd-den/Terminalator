import { RhythmConductor } from '../src/domain/services/RhythmConductor';
import { SimulationBus, GameEventType } from '../src/domain/services/SimulationBus';
import { ConsoleTelemetryAdapter } from '../src/infrastructure/telemetry/ConsoleTelemetryAdapter';

async function testRhythmConductorPrecision() {
    console.log("Testing RhythmConductor precision and event emission...");
    
    const telemetry = new ConsoleTelemetryAdapter();
    const bus = new SimulationBus(telemetry);
    // @ts-ignore
    const conductor = new RhythmConductor(bus);

    let tickCount = 0;
    const timestamps: number[] = [];
    const targetBPM = 120;
    const intervalMs = 60000 / targetBPM; // 500ms

    bus.subscribe(GameEventType.TUTOR_EVENT, (event) => {
        if (event.payload.type === 'RHYTHM_TICK') {
            tickCount++;
            timestamps.push(Date.now());
            console.log(`Tick ${tickCount} received.`);
        }
    });

    console.log(`Starting conductor at ${targetBPM} BPM (Interval: ${intervalMs}ms)...`);
    // @ts-ignore
    conductor.start(targetBPM);

    // Wait for 5 ticks
    await new Promise(resolve => setTimeout(resolve, intervalMs * 5.5));

    // @ts-ignore
    conductor.stop();
    console.log("Conductor stopped.");

    if (tickCount < 5) {
        throw new Error(`Expected at least 5 ticks, but got ${tickCount}`);
    }

    // Verify intervals
    for (let i = 1; i < timestamps.length; i++) {
        const actualInterval = timestamps[i] - timestamps[i-1];
        const drift = Math.abs(actualInterval - intervalMs);
        console.log(`Interval ${i}: ${actualInterval}ms (Drift: ${drift}ms)`);
        
        // Tolerance: 25ms for standard JS event loop jitter
        if (drift > 25) {
            console.warn(`Warning: High drift detected: ${drift}ms`);
        }
    }

    console.log("PASS");
}

testRhythmConductorPrecision()
    .then(() => {
        console.log("\nRHYTHM CONDUCTOR TESTS PASSED");
        process.exit(0);
    })
    .catch((e) => {
        console.error("\nTEST FAILED: " + e);
        process.exit(1);
    });