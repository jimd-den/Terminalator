import { CoreEngine } from '../src/core/CoreEngine';
import { GameEventType } from '../src/domain/services/SimulationBus';
import { createInitialTerminalState } from '../src/domain/entities/TerminalState';

async function verifyAwaitableAnimation() {
    console.log("Starting Verification: Awaitable Animation...");

    const engine = CoreEngine.getInstance();
    await engine.initialize();
    
    const mediator = engine.getSimulationMediator();
    const bus = engine.getSimulationBus();

    let animationResponded = false;
    bus.subscribe(GameEventType.TUTOR_EVENT, (event) => {
        if (event.payload.type === 'PRESENTATION_START') {
            console.log("Animation START received by UI simulation.");
            // Simulate UI completing animation after 1 second
            setTimeout(() => {
                console.log("UI simulation emitting ANIMATION_COMPLETE.");
                bus.emit(GameEventType.TUTOR_EVENT, { type: 'ANIMATION_COMPLETE', payload: {} });
                animationResponded = true;
            }, 1000);
        }
    });

    const state = createInitialTerminalState();
    const startTime = Date.now();
    console.log("Executing command via Mediator...");
    
    await mediator.executeWithTheatre('ls', state);
    
    const duration = Date.now() - startTime;
    console.log("Total execution time: " + duration + "ms");

    if (!animationResponded) throw new Error("Mediator did not wait for animation");
    if (duration < 1000) throw new Error("Mediator proceeded too fast (race condition)");

    console.log("Awaitable Animation PASS");

    engine.shutdown();
    console.log("\nVERIFICATION COMPLETED");
}

verifyAwaitableAnimation()
    .then(() => process.exit(0))
    .catch((e) => {
        console.error("\nVERIFICATION FAILED: " + e);
        process.exit(1);
    });