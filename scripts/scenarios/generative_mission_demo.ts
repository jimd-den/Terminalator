/**
 * generative_mission_demo.ts
 * 
 * Pillar: THE MASTER'S TOOL (Metaprogramming)
 * Pillar: THE SHADOW’S VEIL (Clean Architecture)
 * 
 * Intent:
 * Demonstrates the full vertical slice of the Generative Mission Architecture.
 */

import { SimulationBus } from '../../src/domain/services/SimulationBus';
import { MissionInstantiationService } from '../../src/domain/services/mission/MissionInstantiationService';
import { GenericMissionStrategy } from '../../src/domain/services/mission-strategies/GenericMissionStrategy';
import { ConsoleTelemetryAdapter } from '../../src/infrastructure/telemetry/ConsoleTelemetryAdapter';
import { MissionRepository } from '../../src/domain/services/MissionRepository';
import { JsonMissionDataProvider } from '../../src/infrastructure/data/JsonMissionDataProvider';
import { LessonRegistry } from '../../src/domain/services/LessonRegistry';
import { TestUser } from '../framework/TestUser';
import { MissionStep } from '../../src/domain/entities/Mission';

async function runDemo() {
    console.log("=== GENERATIVE MISSION ARCHITECTURE DEMO ===");

    const telemetry = new ConsoleTelemetryAdapter();
    const user = new TestUser();
    const gameManager = user.getGameManager();
    const worldPatchService = (gameManager as any).worldPatchService;

    const instantiationService = new MissionInstantiationService(worldPatchService);
    const genericStrategy = new GenericMissionStrategy();
    const missionRepository = new MissionRepository(new JsonMissionDataProvider());
    const lessonRegistry = new LessonRegistry();

    const script = `
(define-mission "sabotage" "step1"
  (list
    (step "step1" "CONNECT" "Connect to target system" "ssh admin@server-a"
          (matcher "COMMAND_EXECUTED" "ssh" "nil" "SUCCESS_EXIT")
          (transition "step2" "nil" "LINK_ESTABLISHED"))
    (step "step2" "LOCATE" "Navigate to config folder" "cd /etc"
          (matcher "COMMAND_EXECUTED" "cd" "nil" "DIR_MATCH")
          (transition "step3" "nil" "DIR_ENTERED"))
    (step "step3" "MODIFY" "Delete the config" "rm config"
          (matcher "COMMAND_EXECUTED" "rm" "nil" "SUCCESS_EXIT")
          (transition "nil" "nil" "MISSION_ACCOMPLISHED"))))
`;

    console.log("\n[1/4] Instantiating mission from Scheme DSL...");
    const { grammar, prepSpec } = instantiationService.instantiate(script, "server-a");
    console.log("      Archetype:", grammar.archetype);
    console.log("      Initial Step:", grammar.initialStepId);

    const mission = await gameManager.spawnNPCEvent();
    if (!mission) throw new Error("Spawn failed");
    
    mission.type = 'generative';
    mission.grammar = grammar;
    mission.currentStepId = grammar.initialStepId;
    mission.status = 'active';

    console.log("\n[2/4] Mission Started:", mission.id);

    const commands = [
        "ssh admin@server-a",
        "cd /etc",
        "ls",
        "rm config"
    ];

    console.log("\n[3/4] Running Command Sequence...");

    for (const cmd of commands) {
        console.log("\n      >", cmd);
        const response = await user.exec(cmd);
        
        const result = genericStrategy.evaluate(
            mission, 
            user.getState(), 
            response, 
            missionRepository, 
            lessonRegistry
        );
        
        if (result.progression) {
            console.log("      [PROGRESSION]", result.progression.type, ":", result.progression.message);
            // After progression, pull next lesson
            const updated = gameManager.getMissionById(mission.id);
            if (updated && updated.grammar) {
                const nextStep = updated.grammar.steps.find(s => s.id === updated.currentStepId);
                if (nextStep) console.log("      [TUTOR SUGGESTS]", nextStep.lessonText);
            }
        } else if (result.hint) {
            console.log("      [HINT]", result.hint.message);
        }
    }

    console.log("\n[4/4] Verifying Final State...");
    const finalStatus = mission.status as string;
    if (finalStatus === 'completed') {
        console.log("      [SUCCESS] Mission status is 'completed'.");
        console.log("      [SUCCESS] Generative Mission Vertical Slice Verified!");
    } else {
        console.error("      [FAIL] Mission not completed. Status:", mission.status);
        process.exit(1);
    }

    console.log("\n=== DEMO COMPLETE ===");
}

runDemo().catch(err => {
    console.error(err);
    process.exit(1);
});
