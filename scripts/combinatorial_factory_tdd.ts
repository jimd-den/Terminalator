import { CombinatorialFactory } from '../src/domain/usecases/mission/CombinatorialFactory';
import { MissionMotive, MissionVerb, MissionNoun } from '../src/domain/entities/mission/Grammar';
import { IStructuredCommand, CommandCapability } from '../src/domain/commands/IStructuredCommand';
import { MasteryTracker } from '../src/domain/services/tutor/MasteryTracker';

// 1. Mock Smart Commands
class MockGrepCommand {
    utility = 'grep';
    capabilities = [CommandCapability.READ];
    buildArgs(req: any) { return ['-e', 'target', req.path]; }
    execute() { return {} as any; }
}

class MockAwkCommand {
    utility = 'awk';
    capabilities = [CommandCapability.READ];
    buildArgs(req: any) { return ['{print $1}', req.path]; }
    execute() { return {} as any; }
}

async function testCombinatorialGeneration() {
    console.log("Testing CombinatorialFactory with Mastery...");
    
    const masteryTracker = new MasteryTracker();
    const factory = new CombinatorialFactory([new MockGrepCommand() as any], masteryTracker);

    const mission = factory.createMission({
        motive: MissionMotive.CORPORATE_SABOTAGE,
        verb: MissionVerb.EXTRACT,
        noun: MissionNoun.SERVER_LOGS,
        targetSystem: 'alpha-01'
    });

    console.log("GENERATED MISSION:\n", JSON.stringify(mission, null, 2));

    if (!mission.id.startsWith('M-COR')) throw new Error(`ID should start with M-COR. Got: ${mission.id}`);
    if (mission.metadata.utility !== 'grep') throw new Error("Expected utility 'grep'");
}

async function testMasteryFiltering() {
    console.log("Testing Mastery Filtering...");
    
    const masteryTracker = new MasteryTracker();
    
    // Simulate Grep as Mastered
    for (let i = 0; i < 20; i++) {
        await masteryTracker.recordSuccess('grep');
    }

    // Awk is Novice by default
    const factory = new CombinatorialFactory([
        new MockGrepCommand() as any, 
        new MockAwkCommand() as any
    ], masteryTracker);

    // Verb.EXTRACT needs Capability.READ. Both Grep and Awk have it.
    // It should favor Awk because Grep is MASTER.
    const mission = factory.createMission({
        motive: MissionMotive.CORPORATE_SABOTAGE,
        verb: MissionVerb.EXTRACT,
        noun: MissionNoun.SERVER_LOGS,
        targetSystem: 'alpha'
    });

    console.log("CHOSEN UTILITY (Expect awk):", mission.metadata.utility);
    if (mission.metadata.utility !== 'awk') throw new Error("Should have favored novice tool 'awk'");

    console.log("PASS: Factory correctly favors learning zone.");
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