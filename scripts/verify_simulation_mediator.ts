import { CoreEngine } from '../src/core/CoreEngine';
import { GameEventType } from '../src/domain/services/SimulationBus';
import { createInitialTerminalState } from '../src/domain/entities/TerminalState';

async function verifySimulationMediator() {
    console.log("Starting Verification: Simulation Mediator...");

    const engine = CoreEngine.getInstance();
    await engine.initialize();
    
    const mediator = engine.getSimulationMediator();
    const bus = engine.getSimulationBus();

    let presentationStarted = false;
    bus.subscribe(GameEventType.TUTOR_EVENT, (event) => {
        if (event.payload.type === 'PRESENTATION_START') {
            console.log("Received PRESENTATION_START");
            presentationStarted = true;
        }
    });

    const state = createInitialTerminalState();
    console.log("Executing 'ls' through mediator...");
    
    const response = await mediator.executeWithTheatre('ls', state);
    
    if (!presentationStarted) throw new Error("Presentation was not triggered");
    if (response.exitCode !== 0) throw new Error("Command execution failed");
    
    console.log("Mediator PASS");

    engine.shutdown();
    console.log("\nVERIFICATION COMPLETED");
}

verifySimulationMediator()
    .then(() => process.exit(0))
    .catch((e) => {
        console.error("\nVERIFICATION FAILED: " + e);
        process.exit(1);
    });