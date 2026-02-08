import { TutorSpy } from '../src/domain/services/tutor/analysis/TutorSpy';

function testWpmCalculation() {
    console.log("Testing TutorSpy WPM calculation...");
    const spy = new TutorSpy();
    
    const now = Date.now();
    spy.recordKeystroke('h', now);
    spy.recordKeystroke('e', now + 200);
    spy.recordKeystroke('l', now + 400);
    spy.recordKeystroke('l', now + 600);
    spy.recordKeystroke('o', now + 800);
    spy.recordKeystroke(' ', now + 1000);
    spy.recordKeystroke('w', now + 1200);
    spy.recordKeystroke('o', now + 1400);
    spy.recordKeystroke('r', now + 1600);
    spy.recordKeystroke('l', now + 1800);
    spy.recordKeystroke('d', now + 2000);

    const wpm = spy.calculateWPM(now + 2000);
    console.log(`Calculated WPM: ${wpm}`);
    
    if (wpm < 60 || wpm > 72) throw new Error(`WPM calculation off. Expected ~66, got ${wpm}`);
    
    console.log("PASS");
}

function testReaction() {
    console.log("Testing TutorSpy reaction...");
    const spy = new TutorSpy();
    
    // Low WPM should trigger a warning/hint
    const reaction = spy.analyze(10); 
    if (!reaction || reaction.type !== 'warn') throw new Error("Expected warning for low WPM");
    
    console.log("PASS");
}

try {
    testWpmCalculation();
    testReaction();
    console.log("\nALL TUTOR SPY TESTS PASSED");
} catch (e) {
    console.error(`\nTEST FAILED: ${e}`);
    process.exit(1);
}