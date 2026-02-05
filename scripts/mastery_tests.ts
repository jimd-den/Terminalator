import { MasteryTracker } from '../src/domain/services/tutor/MasteryTracker';

function testMastery() {
    console.log("Testing MasteryTracker...");
    const tracker = new MasteryTracker();

    // Initial level
    if (tracker.getLevel('cd') !== 'NOVICE') throw new Error("Default level should be NOVICE");

    // Successful uses
    for (let i = 0; i < 5; i++) tracker.recordSuccess('cd');
    if (tracker.getLevel('cd') !== 'COMPETENT') throw new Error("Should be COMPETENT after 5 successes");

    for (let i = 0; i < 10; i++) tracker.recordSuccess('cd');
    if (tracker.getLevel('cd') !== 'MASTER') throw new Error("Should be MASTER after 15 successes");

    // Failures
    tracker.recordFailure('ls');
    if (tracker.getFailCount('ls') !== 1) throw new Error("Fail count should be 1");

    console.log("PASS");
}

try {
    testMastery();
    console.log("\\nALL MASTERY TESTS PASSED");
} catch (e) {
    console.error(`\\nTEST FAILED: ${e}`);
    process.exit(1);
}