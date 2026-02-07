import { ConstraintMissionFactory } from '../src/domain/usecases/mission/ConstraintMissionFactory';
import { MissionMotive, MissionVerb, MissionNoun } from '../src/domain/entities/mission/Grammar';
import { IStructuredCommand, CommandCapability } from '../src/domain/commands/IStructuredCommand';
import { MasteryTracker } from '../src/domain/services/tutor/MasteryTracker';
import { UnixKnowledgeBase } from '../src/domain/services/knowledge/UnixKnowledgeBase';

// 1. Mock WorldPatchService
const mockWorldPatchService = { patch: () => {} } as any;

async function testCombinatorialGeneration() {
    console.log("Testing ConstraintMissionFactory...");
    
    const masteryTracker = new MasteryTracker();
    const kb = new UnixKnowledgeBase();
    const factory = new ConstraintMissionFactory(kb, mockWorldPatchService);

    const mission = factory.createMission({
        objective: "Extract logs",
        capabilities: [CommandCapability.SEARCH],
        constraints: ['RECURSIVE'],
        targetSystem: 'alpha-01'
    });

    console.log("GENERATED MISSION:\n", JSON.stringify(mission, null, 2));

    if (!mission.id.startsWith('M-GEN')) throw new Error(`ID should start with M-GEN. Got: ${mission.id}`);
}

async function testMasteryFiltering() {
    console.log("Testing Constraint-based tool selection...");
    
    const kb = new UnixKnowledgeBase();
    const factory = new ConstraintMissionFactory(kb, mockWorldPatchService);

    // Should pick 'grep' for SEARCH
    const mission = factory.createMission({
        objective: "Search files",
        capabilities: [CommandCapability.SEARCH],
        constraints: [],
        targetSystem: 'alpha'
    });

    console.log("CHOSEN TOOL (Expect grep):", mission.grammar?.steps[2].commandMatcher.target);
    if (mission.grammar?.steps[2].commandMatcher.target !== 'grep') throw new Error("Should have selected 'grep'");

    console.log("PASS: Factory correctly solves constraints.");
}

async function runTests() {
    try {
        await testCombinatorialGeneration();
        await testMasteryFiltering();
        console.log("ALL TESTS PASS");
    } catch (e) {
        console.error("FAIL:", e);
        process.exit(1);
    }
}

runTests();