import { DependencyContainer } from '../src/infrastructure/di/DependencyContainer';
import { FileSystem } from '../src/domain/entities/FileSystem';
import { NetworkMap } from '../src/domain/services/NetworkMap';
import { ConsoleTelemetryAdapter } from '../src/infrastructure/telemetry/ConsoleTelemetryAdapter';
import { SimulationBus } from '../src/domain/services/SimulationBus';
import { CheckCommsCommand } from '../src/interface-adapters/commands/game/CheckCommsCommand';
import { TerminalState, createInitialTerminalState } from '../src/domain/entities/TerminalState';

(global as any).__DEV__ = true;

async function verifyCheckComms() {
    console.log("Verifying 'check-comms' combinatorial integration...");

    const fs = new FileSystem();
    const networkMap = new NetworkMap();
    const telemetry = new ConsoleTelemetryAdapter();
    const bus = new SimulationBus(telemetry);
    const gameManager = DependencyContainer.createGameManager(fs, networkMap, telemetry, bus);
    
    const command = new CheckCommsCommand(gameManager);
    const state = createInitialTerminalState();

    // 1. Execute check-comms until we get a Combinatorial Mission (M- prefix)
    let mission;
    let attempts = 0;
    while (attempts < 10) {
        await command.execute([], { stdin: '' } as any, state);
        const activeMissions = gameManager.getActiveMissions();
        mission = activeMissions[activeMissions.length - 1];
        if (mission.id.startsWith('M-')) break;
        attempts++;
    }

    if (!mission) throw new Error("FAIL: No mission spawned.");
    console.log(`Spawned mission after ${attempts + 1} attempts: ${mission.id}`);

    // 2. Verify metadata
    console.log("SPAWNED MISSION LOGIC:");
    console.log(JSON.stringify(mission.metadata?.logic, null, 2));

    if (!mission.metadata?.logic) {
        throw new Error("FAIL: Combinatorial mission lacks logic metadata.");
    }

    console.log("\nPASS: 'check-comms' is successfully generating combinatorial missions.");
}

verifyCheckComms().catch(e => {
    console.error(e);
    process.exit(1);
});
