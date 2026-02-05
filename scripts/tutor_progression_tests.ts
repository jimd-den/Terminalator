import { CombinatorialFactory } from '../src/domain/usecases/mission/CombinatorialFactory';
import { TutorLedProgression } from '../src/domain/usecases/tutor/TutorLedProgression';
import { MasteryTracker } from '../src/domain/services/tutor/MasteryTracker';
import { MissionVerb } from '../src/domain/entities/mission/Grammar';
import { IStructuredCommand, CommandCapability } from '../src/domain/commands/IStructuredCommand';

// 1. Setup Mock Grammar components
class MockGrepCommand {
    utility = 'grep';
    capabilities = [CommandCapability.READ];
    buildArgs() { return []; }
    execute() { return {} as any; }
}

async function testTutorForcedProgression() {
    console.log("Testing Tutor-Led Forced Progression...");

    const masteryTracker = new MasteryTracker();
    const factory = new CombinatorialFactory([new MockGrepCommand() as any], masteryTracker);
    const progression = new TutorLedProgression(factory, masteryTracker);

    // 2. Simulate user failing 'grep' 5 times
    for (let i = 0; i < 5; i++) {
        await masteryTracker.recordFailure('grep');
    }

    // 3. Request next mission
    const mission = await progression.generateNextMission('gamma-09');

    console.log("GENERATED MISSION UTILITY:", mission.metadata.utility);

    if (mission.metadata.utility !== 'grep') throw new Error("Should have forced 'grep' mission");
    if (mission.metadata.logic.verb !== MissionVerb.EXTRACT) throw new Error("Incorrect verb mapping");

    console.log("PASS: Tutor successfully forced mission focus.");
}

async function runTests() {
    try {
        await testTutorForcedProgression();
        console.log("ALL TESTS PASS");
    } catch (e) {
        console.error("FAIL:", e);
        process.exit(1);
    }
}

runTests();
