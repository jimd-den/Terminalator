
import { SimulationBus, GameEventType } from '../src/domain/services/SimulationBus';
import { TelemetryPort } from '../src/domain/ports/TelemetryPort';
import { TutorObserver } from '../src/domain/services/tutor/TutorObserver';
import { PsychAdapter } from '../src/domain/services/tutor/PsychAdapter';
import { TutorService } from '../src/domain/services/TutorService';

// Mock Dependencies
const mockTelemetry: TelemetryPort = {
    trace: (name: string, fn: () => any) => fn(),
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
    metric: () => {}
} as any;

const mockTutorService: TutorService = {
    analyzeGameState: () => null
} as any;

async function testTutorReactivity() {
    console.log("Starting Tutor Reactivity Test...");

    const bus = new SimulationBus(mockTelemetry);
    const psychAdapter = new PsychAdapter();
    const mockFsService = { resolve: () => null } as any;
    const observer = new TutorObserver(bus, psychAdapter, mockTutorService, mockFsService);

    let reactionReceived = false;
    observer.onReaction((action) => {
        console.log("Reaction Received:", action.message);
        reactionReceived = true;
    });

    console.log("Emitting COMMAND_EXECUTED event (exitCode: 1)...");
    bus.emit(GameEventType.COMMAND_EXECUTED, {
        command: 'ls',
        args: ['/nonexistent'],
        exitCode: 1,
        output: 'ls: /nonexistent: No such file or directory',
        cwd: '/'
    });

    if (reactionReceived) {
        console.log("SUCCESS: Tutor reacted to event.");
    } else {
        console.error("FAILURE: Tutor did NOT react to event.");
        process.exit(1);
    }
}

testTutorReactivity().catch(err => {
    console.error(err);
    process.exit(1);
});
