/**
 * verify_tutor_recommendations.ts
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * E2E Simulation: Verifying the Tutor's "User-Facing" Logic
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * This test simulates a user following the Tutor's instructions step-by-step
 * to ensure the planning loop correctly updates based on discovered knowledge.
 */

import { SimulationBus, GameEventType } from "../src/domain/services/SimulationBus";
import { TutorObserver } from "../src/domain/services/tutor/TutorObserver";
import { PsychAdapter } from "../src/domain/services/tutor/PsychAdapter";
import { KnowledgeType } from "../src/domain/entities/knowledge/KnowledgeEntity";

async function testUserJourney() {
    console.log("--- Starting Tutor Recommendation Verification ---");

    const bus = new SimulationBus({ trace: (n: any, f: any) => f(), info: console.log, debug: () => {} } as any);
    const psychAdapter = new PsychAdapter();
    
    // Mock Services
    const mockTutorService = {
        getFileSystem: () => ({
            resolve: () => ({ children: new Map([['bypass.sh', {}]]) }) // User has the tool
        })
    } as any;

    const mockFsService = {
        resolve: () => ({ children: new Map([['bypass.sh', {}]]) })
    } as any;

    const observer = new TutorObserver(bus, psychAdapter, mockTutorService, mockFsService);

    let lastRecommendation = "";
    observer.onReaction((action) => {
        if (action.type === 'HINT') {
            console.log(`[TUTOR SAYS]: ${action.message}`);
            // Extract command from message "Execute: <command>"
            const match = /Execute: ([^\s]+)/.exec(action.message);
            if (match) lastRecommendation = match[1];
        }
    });

    // 1. START MISSION
    console.log("\nStep 1: Starting a generative mission...");
    const mission = {
        id: "M-TEST-1",
        type: "generative",
        targetSystem: "TARGET-NODE",
        status: "active"
    } as any;
    observer.setActiveMission(mission);
    observer.triggerPlanning();

    // The first recommendation should be to find nodes or check comms
    console.log(`Verification: Initial recommendation is "${lastRecommendation}"`);

    // 2. DISCOVER NODE (via check-comms or manual)
    console.log("\nStep 2: Simulating 'check-comms' output...");
    bus.emit(GameEventType.COMMAND_EXECUTED, {
        command: "check-comms",
        output: "Target: SYNERGY-NODE\nStatus: HANDSHAKE_COMPLETE",
        exitCode: 0,
        state: { fsContext: "terminalator" }
    });

    // Tutor should now know about SYNERGY-NODE and recommend 'net-link'
    if (lastRecommendation.includes("net-link")) {
        console.log("SUCCESS: Tutor recommended 'net-link' after finding hostname.");
    } else {
        console.error(`FAILURE: Expected net-link recommendation, got "${lastRecommendation}"`);
    }

    // 3. CONNECT TO NODE
    console.log("\nStep 3: Simulating successful 'net-link'...");
    bus.emit(GameEventType.COMMAND_EXECUTED, {
        command: "net-link admin@SYNERGY-NODE",
        output: "LINK ESTABLISHED to SYNERGY-NODE.",
        exitCode: 0,
        state: { fsContext: "SYNERGY-NODE" }
    });

    // 4. SCAN FOR FILES (or knowledge)
    console.log("\nStep 4: Simulating 'ls' to find paths...");
    bus.emit(GameEventType.COMMAND_EXECUTED, {
        command: "ls",
        output: "total 1\n-rw-r--r-- 1 admin admin 12 Feb 14 12:00 secret.key",
        exitCode: 0,
        state: { fsContext: "SYNERGY-NODE" }
    });

    // Now we have PATH and METADATA (connected). Tutor should recommend 'bypass.sh' or 'cat'
    console.log(`Verification: Final recommendation is "${lastRecommendation}"`);
    if (lastRecommendation.includes("bypass.sh")) {
        console.log("SUCCESS: Tutor recommended 'bypass.sh' to gain credentials.");
    } else {
        console.error("FAILURE: Tutor did not recommend the exploit tool.");
    }
}

testUserJourney().catch(console.error);
