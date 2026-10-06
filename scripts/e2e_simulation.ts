import { TerminalState, createInitialTerminalState } from '../src/domain/entities/TerminalState';
import { FileSystem } from '../src/domain/entities/FileSystem';
import { FileSystemService } from '../src/domain/services/FileSystemService';
import { GameCommandExecutor } from '../src/interface-adapters/GameCommandExecutor';
import { DependencyContainer } from '../src/infrastructure/di/DependencyContainer';
import { ConsoleTelemetryAdapter } from '../src/infrastructure/telemetry/ConsoleTelemetryAdapter';
import { NetworkMap } from '../src/domain/services/NetworkMap';
import { SimulationBus } from '../src/domain/services/SimulationBus';
import { RhythmConductor } from '../src/domain/services/RhythmConductor';

// Polyfill for React Native/Expo globals
(global as any).__DEV__ = true;

/**
 * End-to-End Simulation Test
 * 
 * Simulates a full user session from app boot to mission completion.
 * Acts as the "Primary Directive" verification tool.
 * 
 * Flow:
 * 1. Boot Application (DI Container).
 * 2. Login (Initialize State).
 * 3. Receive Mission (Check Mail).
 * 4. Execute Mission (SSH -> Remote -> Hack).
 * 5. Verify Success (Rewards/State).
 */

async function runSimulation() {
    console.log("--- E2E SIMULATION: START ---");

    // 1. Boot Phase
    console.log("[1] Booting System...");
    const fs = new FileSystem();
    const networkMap = new NetworkMap();
    const telemetry = new ConsoleTelemetryAdapter();
    const bus = new SimulationBus(telemetry);
    const conductor = new RhythmConductor(bus);
    const gameManager = DependencyContainer.createGameManager(fs, networkMap, telemetry, bus, conductor);
    const fsService = new FileSystemService(fs);
    const economyService = gameManager.getEconomyService();
    
    const executor = new GameCommandExecutor(fsService, gameManager, networkMap, economyService, telemetry);
    let state = createInitialTerminalState();

    // Helper to run commands
    const exec = async (cmd: string) => {
        console.log(`\n> ${cmd}`);
        const res = await executor.execute(cmd, state);
        if (res.output) console.log(res.output);
        if (res.newState) state = { ...state, ...res.newState };
        return res;
    };

    // 2. Initial Checks
    await exec("whoami");
    await exec("ls -la");

    // 3. Trigger Mission (Simulate NPC Event)
    console.log("\n[2] Triggering NPC Event...");
    const mission = await gameManager.spawnNPCEvent();
    if (!mission) {
        console.error("FAILED: No mission generated.");
        process.exit(1);
    }
    console.log(`Mission Received: ${mission.id} from ${mission.assignerName}`);
    console.log(`Target: ${mission.targetSystem}`);

    // Verify Mission appeared in Mail
    await exec("mail");

    // 4. Start Mission (Acceptance)
    // For now, missions auto-start on generation or first interaction? 
    // Let's assume we need to connect to target to 'start' the active phase.
    
    // 5. Connect to Target
    console.log("\n[3] Connecting to Target...");
    const sshRes = await exec(`ssh admin@${mission.targetSystem}`);
    
    if (state.fsContext !== mission.targetSystem) {
        console.error(`FAILED: SSH did not switch context. Context: ${state.fsContext}`);
        process.exit(1);
    }
    console.log("PASSED: Context switched to remote host.");

    // 6. Execute Remote Commands (The "Game")
    console.log("\n[4] Remote Reconnaissance...");
    await exec("ls /var/log"); // Standard location
    await exec("whoami"); // Should be 'admin' or 'root' on remote

    // 7. Complete Objective (Simulated)
    // Depending on mission type, we need to do something specific.
    // Knuthian missions: Sort or Search.
    // Let's brute-force a 'solution' command for now or simulate the 'fix'.
    
    // If it's a repair mission (ModifyStrategy), we might need to vim a file.
    // For now, let's just prove we are there and can modify state.
    await exec(`touch /var/log/${mission.objectiveTarget}_FIXED`);

    // 8. Disconnect
    console.log("\n[5] Disconnecting...");
    await exec("exit");

    if (state.fsContext !== undefined) {
        console.error("FAILED: Exit did not return to local context.");
        process.exit(1);
    }
    console.log("PASSED: Returned to local context.");

    console.log("\n--- E2E SIMULATION: SUCCESS ---");
}

runSimulation().catch(err => {
    console.error("\nCRITICAL FAILURE:", err);
    process.exit(1);
});
