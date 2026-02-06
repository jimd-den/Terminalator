import { CombinatorialFactory } from '../src/domain/usecases/mission/CombinatorialFactory';
import { MissionIntentInterpreter } from '../src/domain/interpreters/MissionIntentInterpreter';
import { MissionMotive, MissionVerb, MissionNoun } from '../src/domain/entities/mission/Grammar';
import { IStructuredCommand, CommandCapability } from '../src/domain/commands/IStructuredCommand';
import { MasteryTracker } from '../src/domain/services/tutor/MasteryTracker';

// 1. Setup Mock Grammar components
class MockGrepCommand {
    utility = 'grep';
    capabilities = [CommandCapability.READ];
    buildArgs(req: any) { return ['-e', 'target', req.path]; }
    execute() { return {} as any; }
}

function testTutorIntentReading() {
    console.log("Testing Tutor Intent Reading...");

    const masteryTracker = new MasteryTracker();
    const factory = new CombinatorialFactory([new MockGrepCommand() as any], masteryTracker);
    const interpreter = new MissionIntentInterpreter();

    // 2. Generate a combinatorial mission
    const mission = factory.createMission({
        motive: MissionMotive.CORPORATE_SABOTAGE,
        verb: MissionVerb.EXTRACT,
        noun: MissionNoun.SERVER_LOGS,
        targetSystem: 'delta-v'
    });

    // 3. Interpret the intent (The Tutor "reads" the mission)
    const intent = interpreter.visit(mission);

    console.log("INTERPRETED INTENT:\n", JSON.stringify(intent, null, 2));

    if (intent.motive !== MissionMotive.CORPORATE_SABOTAGE) throw new Error("Incorrect motive");
    if (intent.primaryUtility !== 'grep') throw new Error("Incorrect utility");
    if (intent.verb !== MissionVerb.EXTRACT) throw new Error("Incorrect verb");
    if (intent.targetPath !== '/var/log/httpd/access.log') throw new Error("Incorrect path");

    console.log("PASS: Tutor successfully read mission intent.");
}

try {
    testTutorIntentReading();
} catch (e) {
    console.error("FAIL:", e);
    process.exit(1);
}
