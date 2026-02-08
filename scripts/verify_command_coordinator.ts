import { CoreEngine } from '../src/core/CoreEngine';
import { GameEventType } from '../src/domain/services/SimulationBus';
import { createInitialTerminalState } from '../src/domain/entities/TerminalState';

async function verifyCommandCoordinator() {
    console.log("Starting Verification: Command Coordinator...");

    const engine = CoreEngine.getInstance();
    await engine.initialize();
    
    const coordinator = engine.getCommandCoordinator();
    const bus = engine.getSimulationBus();

    let presentationStarted = false;
    bus.subscribe(GameEventType.TUTOR_EVENT, (event) => {
        if (event.payload.type === 'PRESENTATION_START') {
            console.log("Received PRESENTATION_START for verb: " + event.payload.payload.verb);
            presentationStarted = true;
        }
    });

    const state = createInitialTerminalState();
    console.log("Executing 'ls' through coordinator...");
    
    const response = await coordinator.execute('ls', state);
    
    if (!presentationStarted) throw new Error("Presentation was not triggered");
    if (response.exitCode !== 0) throw new Error("Command execution failed");
    
    console.log("Command output length: " + response.output.length);
    console.log("Coordinator PASS");

    engine.shutdown();
    console.log("\nVERIFICATION COMPLETED");
}

verifyCommandCoordinator()
    .then(() => process.exit(0))
    .catch((e) => {
        console.error("\nVERIFICATION FAILED: " + e);
        process.exit(1);
    });