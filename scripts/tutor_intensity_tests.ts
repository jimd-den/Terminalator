import { MasteryTracker } from '../src/domain/services/tutor/MasteryTracker';
import { IntensityCalculator, DialogueIntensity } from '../src/domain/services/tutor/IntensityCalculator';

async function testIntensityScaling() {
    console.log("Testing Intensity Scaling...");

    const masteryTracker = new MasteryTracker();
    const calculator = new IntensityCalculator(masteryTracker);

    // 1. Novice Tool (Expect GENTLE)
    const intensity1 = calculator.calculate('grep');
    console.log("Novice Tool Intensity (grep):", intensity1);
    if (intensity1 !== DialogueIntensity.GENTLE) throw new Error("Expected GENTLE for Novice tool");

    // 2. Competent Tool (Expect STANDARD)
    for (let i = 0; i < 6; i++) await masteryTracker.recordSuccess('cd');
    const intensity2 = calculator.calculate('cd');
    console.log("Competent Tool Intensity (cd):", intensity2);
    if (intensity2 !== DialogueIntensity.STANDARD) throw new Error("Expected STANDARD for Competent tool");

    // 3. Master Tool (Expect HARSH)
    for (let i = 0; i < 20; i++) await masteryTracker.recordSuccess('ls');
    const intensity3 = calculator.calculate('ls');
    console.log("Master Tool Intensity (ls):", intensity3);
    if (intensity3 !== DialogueIntensity.HARSH) throw new Error("Expected HARSH for Master tool");

    console.log("PASS: Intensity scales correctly with mastery.");
}

async function run() {
    try {
        await testIntensityScaling();
    } catch (e) {
        console.error("FAIL:", e);
        process.exit(1);
    }
}

run();
