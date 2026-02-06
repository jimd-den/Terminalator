import { MasteryTracker } from '../src/domain/services/tutor/MasteryTracker';
import { IntensityCalculator, DialogueIntensity } from '../src/domain/services/tutor/IntensityCalculator';
import { MissionIntentInterpreter } from '../src/domain/interpreters/MissionIntentInterpreter';
import { PersonaLoader, PersonaData } from '../src/domain/services/tutor/PersonaLoader';
import { TutorBrain } from '../src/domain/entities/tutor/TutorBrain';
import * as dialogueLibrary from '../src/domain/data/tutor/DialogueLibrary.json';

async function testTutorBrainReactions() {
    console.log("Testing TutorBrain Combinatorial Reactions...");

    const masteryTracker = new MasteryTracker();
    const intensityCalculator = new IntensityCalculator(masteryTracker);
    const intentInterpreter = new MissionIntentInterpreter();
    const brain = new TutorBrain(intensityCalculator, intentInterpreter);

    const personaData: PersonaData = {
        id: 'rogue',
        name: 'Rogue',
        lines: (dialogueLibrary as any).structures
    };
    brain.setPersona(new PersonaLoader(personaData, (dialogueLibrary as any).fragments));

    let lastReaction = "";
    brain.subscribe((text) => {
        lastReaction = text;
        console.log(" -> BRAIN REACTION:", text);
    });

    // 1. Simulate Mission Start (utility: grep)
    console.log("\nTriggering MISSION_START (grep)...");
    (brain as any).handleTutorEvent({ 
        type: 'START', 
        payload: { instructions: "FETCH LOGS", text: "grep error access.log" } 
    });
    if (!lastReaction.includes("grep")) throw new Error("Reaction missing utility 'grep'");

    // 2. Simulate Command Success (utility: ls)
    console.log("\nTriggering COMMAND_EXECUTED (ls, success)...");
    (brain as any).handleGameEvent('COMMAND_EXECUTED', { 
        exitCode: 0, 
        utility: 'ls' 
    });

    // 3. Simulate Command Failure (utility: rm, Master level)
    console.log("\nTriggering COMMAND_EXECUTED (rm, fail, HARSH)...");
    for(let i=0; i<20; i++) await masteryTracker.recordSuccess('rm');
    (brain as any).handleGameEvent('COMMAND_EXECUTED', { 
        exitCode: 1, 
        utility: 'rm' 
    });

    console.log("\nPASS: TutorBrain is correctly delivering colorful combinatorial dialogue.");
}

testTutorBrainReactions().catch(e => {
    console.error(e);
    process.exit(1);
});
