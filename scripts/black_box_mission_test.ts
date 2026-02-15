/**
 * black_box_mission_test.ts
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * Black Box Mission Solvability Test
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Tests the entire pipeline from mission generation to GOAP-driven completion.
 * The "User" in this test purely executes whatever the Tutor recommends.
 */

import { FileSystem } from '../src/domain/entities/FileSystem';
import { NetworkMap } from '../src/domain/services/NetworkMap';
import { SimulationBus, GameEventType } from '../src/domain/services/SimulationBus';
import { RhythmConductor } from '../src/domain/services/RhythmConductor';
import { DependencyContainer } from '../src/infrastructure/di/DependencyContainer';
import { GameCommandExecutor } from '../src/interface-adapters/GameCommandExecutor';
import { createInitialTerminalState } from '../src/domain/entities/TerminalState';
import { FileSystemService } from '../src/domain/services/FileSystemService';

async function runBlackBoxTest() {
    console.log("--- STARTING BLACK BOX MISSION SIMULATION ---");

    // 1. Setup Environment
    const fs = new FileSystem();
    const networkMap = new NetworkMap();
    const bus = new SimulationBus({ trace: (n: string, f: Function) => f(), info: () => {}, debug: () => {}, warn: () => {} } as any);
    const conductor = new RhythmConductor(bus);
    
    // Create SINGLE FileSystemService for the whole simulation via DI container
    const fsService = DependencyContainer.createFileSystemService(fs);

    // GameManager needs to be aware of this service
    const gameManager = DependencyContainer.createGameManager(fs, networkMap, { trace: (n: string, f: Function) => f(), info: () => {} } as any, bus, conductor);
    
    // EXTREMELY IMPORTANT: Sync all internal references to use our shared service
    (gameManager as any).fsService = fsService;
    (gameManager as any).mailSystem.fsService = fsService;
    gameManager.getTutorObserver().setFileSystemService(fsService);

    const economyService = gameManager.getEconomyService();
    // Executor MUST use the same service
    const executor = new GameCommandExecutor(fsService, gameManager, networkMap, economyService);
    
    // Initial Credit for tools
    gameManager.getTutorObserver().getKnowledgeBase().learn({
        type: 'METADATA' as any,
        value: 'INITIAL_FUNDS',
        discoveredAt: Date.now(),
        source: 'system',
        isBelief: false
    });
    
    gameManager.getEconomyService().credit(50000, "Test Setup");

    let state = createInitialTerminalState();

    let missionComplete = false;
    let lastRecommendation = "";
    let stepCount = 0;
    const MAX_STEPS = 20;

    // Listen for Tutor's strategic hints
    gameManager.getTutorObserver().onReaction((action) => {
        if (action.type === 'HINT') {
            console.log(`[TUTOR HINT]: ${action.message}`);
            // Extract the command to run: "Execute: <cmd>"
            const match = /Execute: (.+)$/.exec(action.message);
            if (match) {
                lastRecommendation = match[1].trim();
            }
        }
    });

    bus.subscribe(GameEventType.MISSION_PROGRESS, (event) => {
        if (event.payload.type === 'COMPLETED') {
            missionComplete = true;
            console.log("!!! MISSION COMPLETE SIGNAL RECEIVED !!!");
        }
    });

    // 2. Trigger Generative Mission
    console.log("\n[1] Triggering generative mission...");
    // Find a vendor node to make it a vendor mission
    const vendorNode = networkMap.getAllHosts().find(h => h.includes('gw') || h.includes('COM'));
    const mission = await gameManager.spawnNPCEvent();
    if (!mission) throw new Error("Failed to spawn mission");
    
    // Force target to a known vendor if needed for this test
    if (vendorNode) (mission as any).targetSystem = vendorNode;
    
    console.log(`Mission ${mission.id} generated. Goal: ${mission.description} Target: ${mission.targetSystem}`);

    // Activate the mission in the observer
    gameManager.startMission(mission.id, state);

    // 3. The "User" Loop
    while (!missionComplete && stepCount < MAX_STEPS) {
        stepCount++;
        
        // Force planning if we don't have a recommendation
        if (!lastRecommendation) {
            gameManager.getTutorObserver().triggerPlanning();
        }

        if (!lastRecommendation) {
            console.log("User: No recommendation yet. Waiting for Tutor...");
            await new Promise(resolve => setTimeout(resolve, 500));
            if (!lastRecommendation) {
                console.log("User: Still nothing. Let's try 'net-scan' to discover nodes.");
                lastRecommendation = "net-scan";
            }
        }

        const cmdToRun = lastRecommendation;
        lastRecommendation = ""; // Clear for next step

        console.log(`\n[Step ${stepCount}] [CWD: ${state.currentDirectory}] [HOST: ${state.fsContext || 'local'}] User types: ${cmdToRun}`);
        const res = await executor.execute(cmdToRun, state);
        
        console.log(`Terminal Output:\n${res.output}`);
        if (res.newState) {
            state = { ...state, ...res.newState };
        }

        // Give the observer a moment to process stdout and re-plan
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (missionComplete) {
        console.log("\n--- SUCCESS: Mission completed using purely Tutor recommendations! ---");
        (gameManager.getEconomyService() as any).dispose();
        process.exit(0);
    } else {
        console.error(`\n--- FAILURE: Mission timed out after ${stepCount} steps. ---`);
        (gameManager.getEconomyService() as any).dispose();
        process.exit(1);
    }
}

runBlackBoxTest().catch(err => {
    console.error(err);
    process.exit(1);
});
