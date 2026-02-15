import { CoreEngine } from '../src/core/CoreEngine';
import { createInitialTerminalState } from '../src/domain/entities/TerminalState';
import { GameEventType } from '../src/domain/services/SimulationBus';

async function runStressTest() {
    console.log("Starting Mega Scale Stress Test...");

    const engine = CoreEngine.getInstance();
    await engine.initialize();
    
    const mediator = engine.getSimulationMediator();
    const bus = engine.getSimulationBus();

    let completedCommands = 0;
    const TOTAL_COMMANDS = 50;
    const START_TIME = Date.now();

    return new Promise<void>((resolve, reject) => {
        const unsubscribe = bus.subscribe(GameEventType.TUTOR_EVENT, (event) => {
            if (event.payload.type === 'THEATRE_COMPLETE') {
                completedCommands++;
                if (completedCommands % 10 === 0) {
                    console.log(`Completed ${completedCommands}/${TOTAL_COMMANDS} commands...`);
                }
                
                if (completedCommands >= TOTAL_COMMANDS) {
                    const duration = Date.now() - START_TIME;
                    console.log(`\nSTRESS TEST COMPLETE.`);
                    console.log(`Total Time: ${duration}ms`);
                    console.log(`Avg Time/Cmd: ${(duration / TOTAL_COMMANDS).toFixed(2)}ms`);
                    
                    unsubscribe();
                    engine.shutdown();
                    resolve();
                } else {
                    // Trigger next command immediately
                    mediator.executeWithTheatre(`ls stress_${completedCommands}`, createInitialTerminalState());
                }
            }
        });

        // Start the chain
        mediator.executeWithTheatre('ls start', createInitialTerminalState());
    });
}

runStressTest()
    .then(() => process.exit(0))
    .catch((e) => {
        console.error("\nSTRESS TEST FAILED: " + e);
        process.exit(1);
    });