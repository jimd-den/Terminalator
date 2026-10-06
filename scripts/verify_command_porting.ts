import { CoreEngine } from '../src/core/CoreEngine';
import { createInitialTerminalState } from '../src/domain/entities/TerminalState';
import { GameEventType } from '../src/domain/services/SimulationBus';

async function verifyCommandPorting() {
    console.log("Starting Verification: Command Porting...");

    const engine = CoreEngine.getInstance();
    await engine.initialize();
    
    const mediator = engine.getSimulationMediator();
    const bus = engine.getSimulationBus();

    const expectedVerbs: Record<string, string> = {
        'ls': 'SCANNING DATA SECTORS',
        'mkdir': 'SYNTHESIZING BINARY',
        'cat': 'EXTRACTING DATA STREAM',
        'rm': 'PURGING ARTIFACTS'
    };

    for (const [cmd, verb] of Object.entries(expectedVerbs)) {
        let receivedVerb = '';
        const unsub = bus.subscribe(GameEventType.TUTOR_EVENT, (event) => {
            if (event.payload.type === 'PRESENTATION_START') {
                receivedVerb = event.payload.payload.verb;
            }
        });

        console.log(`Testing command: ${cmd}`);
        await mediator.executeWithTheatre(cmd + ' test_target', createInitialTerminalState());
        unsub();

        if (receivedVerb !== verb) {
            throw new Error(`Command ${cmd} expected verb ${verb}, but received ${receivedVerb}`);
        }
        console.log(`PASS: ${cmd} -> ${verb}`);
    }

    engine.shutdown();
    console.log("\nCommand Porting PASS. ALL CORE VERBS VERIFIED.");
}

verifyCommandPorting()
    .then(() => process.exit(0))
    .catch((e) => {
        console.error("\nVERIFICATION FAILED: " + e);
        process.exit(1);
    });