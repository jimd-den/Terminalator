import { ConstraintMissionFactory } from '../src/domain/usecases/mission/ConstraintMissionFactory';
import { TutorLedProgression } from '../src/domain/usecases/tutor/TutorLedProgression';
import { MasteryTracker } from '../src/domain/services/tutor/MasteryTracker';
import { MissionVerb } from '../src/domain/entities/mission/Grammar';
import { IStructuredCommand, CommandCapability } from '../src/domain/commands/IStructuredCommand';
import { UnixKnowledgeBase } from '../src/domain/services/knowledge/UnixKnowledgeBase';

const mockWorldPatchService = { patch: () => {} } as any;

async function testTutorForcedProgression() {
    console.log("Testing Tutor-Led Forced Progression...");

    const masteryTracker = new MasteryTracker();
    const kb = new UnixKnowledgeBase();
    const factory = new ConstraintMissionFactory(kb, mockWorldPatchService);
    const progression = new TutorLedProgression(factory, masteryTracker);

    // 2. Simulate user failing 'grep' 5 times
    for (let i = 0; i < 5; i++) {
        await masteryTracker.recordFailure('grep');
    }

    // 3. Request next mission
    const mission = await progression.generateNextMission('gamma-09');

    // NOTE: Constraint-based missions might not have same metadata as old factory!
    // We check grammar for the tool instead.
    const tool = mission.grammar?.steps[2].commandMatcher.target;
    console.log("GENERATED MISSION TOOL:", tool);

    if (tool !== 'grep') throw new Error("Should have forced 'grep' mission");

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
