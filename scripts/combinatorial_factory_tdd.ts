import { CombinatorialFactory } from '../src/domain/usecases/mission/CombinatorialFactory';
import { MissionMotive, MissionVerb, MissionNoun } from '../src/domain/entities/mission/Grammar';
import { IStructuredCommand, CommandCapability } from '../src/domain/commands/IStructuredCommand';

// 1. Mock a Smart Command
class MockGrepCommand {
    utility = 'grep';
    capabilities = [CommandCapability.FILTER, CommandCapability.READ];
    buildArgs(req: any) { return ['-e', 'target', req.path]; }
    execute() { return { output: '', newState: {} as any, exitCode: 0 }; }
}

function testCombinatorialGeneration() {
    console.log("Testing CombinatorialFactory...");
    
    const mockGrep = new MockGrepCommand() as unknown as IStructuredCommand;
    const factory = new CombinatorialFactory([mockGrep]);

    const mission = factory.createMission({
        motive: MissionMotive.CORPORATE_SABOTAGE,
        verb: MissionVerb.EXTRACT,
        noun: MissionNoun.SERVER_LOGS,
        targetSystem: 'alpha-01'
    });

    console.log("GENERATED MISSION:\n", JSON.stringify(mission, null, 2));

    if (!mission.id.startsWith('M-COR')) throw new Error(`ID should start with M-COR. Got: ${mission.id}`);
    if (mission.metadata.utility !== 'grep') throw new Error("Expected utility 'grep'");
    if (mission.targetSystem !== 'alpha-01') throw new Error("Expected system 'alpha-01'");
    if (mission.objectiveTarget !== '/var/log/httpd/access.log') throw new Error("Incorrect path mapping");

    console.log("PASS: Combinatorial mission successfully assembled.");
}

try {
    testCombinatorialGeneration();
} catch (e) {
    console.error("FAIL:", e);
    process.exit(1);
}
