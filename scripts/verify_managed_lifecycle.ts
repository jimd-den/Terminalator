import { CoreEngine } from '../src/core/CoreEngine';
import { GameEventType } from '../src/domain/services/SimulationBus';
import { createInitialTerminalState } from '../src/domain/entities/TerminalState';

async function verifyManagedLifecycle() {
    console.log("Starting Verification: Managed Execution Lifecycle...");

    const engine = CoreEngine.getInstance();
    await engine.initialize();
    
    const mediator = engine.getSimulationMediator();
    const bus = engine.getSimulationBus();

    let preAnimReceived = false;
    let postAnimReceived = false;
    let cardReceived = false;

    bus.subscribe(GameEventType.TUTOR_EVENT, (event) => {
        const data = event.payload;
        if (!data) return;

        if (data.type === 'PRESENTATION_START') {
            console.log("[UI Simulation] PRE-animation started.");
            preAnimReceived = true;
            // Simulate completion
            setTimeout(() => {
                console.log("[UI Simulation] Emitting ANIMATION_COMPLETE for PRE.");
                bus.emit(GameEventType.TUTOR_EVENT, { type: 'ANIMATION_COMPLETE' });
            }, 500);
        } else if (data.type === 'PRESENTATION_RESULT') {
            console.log("[UI Simulation] POST-animation started.");
            postAnimReceived = true;
            // Simulate completion
            setTimeout(() => {
                console.log("[UI Simulation] Emitting ANIMATION_COMPLETE for POST.");
                bus.emit(GameEventType.TUTOR_EVENT, { type: 'ANIMATION_COMPLETE' });
            }, 500);
        } else if (data.type === 'RESULT_CARD') {
            console.log("[UI Simulation] RESULT_CARD received: " + data.payload.command);
            cardReceived = true;
        }
    });

    const state = createInitialTerminalState();
    console.log("Triggering mediated execution...");
    await mediator.executeWithTheatre('ls', state);

    if (!preAnimReceived) throw new Error("PRE-animation stage missed");
    if (!postAnimReceived) throw new Error("POST-animation stage missed");
    if (!cardReceived) throw new Error("RESULT_CARD stage missed");

    engine.shutdown();
    console.log("\nManaged Lifecycle PASS. VERIFICATION COMPLETED.");
}

verifyManagedLifecycle()
    .then(() => process.exit(0))
    .catch((e) => {
        console.error("\nVERIFICATION FAILED: " + e);
        process.exit(1);
    });