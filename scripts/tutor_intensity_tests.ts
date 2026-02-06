import { MasteryTracker } from '../src/domain/services/tutor/MasteryTracker';
import { IntensityCalculator, DialogueIntensity } from '../src/domain/services/tutor/IntensityCalculator';
import { PersonaLoader, PersonaData } from '../src/domain/services/tutor/PersonaLoader';

async function testIntensityScaling() {
    console.log("Testing Intensity Scaling...");

    const masteryTracker = new MasteryTracker();
    const calculator = new IntensityCalculator(masteryTracker);

    // 1. Novice Tool (Expect GENTLE)
    const intensity1 = calculator.calculate('grep');
    console.log("Novice Tool Intensity (grep):", intensity1);
    if (intensity1 !== DialogueIntensity.GENTLE) throw new Error("Expected GENTLE for Novice tool");

    // 2. Master Tool (Expect HARSH)
    for (let i = 0; i < 20; i++) await masteryTracker.recordSuccess('ls');
    const intensity2 = calculator.calculate('ls');
    console.log("Master Tool Intensity (ls):", intensity2);
    if (intensity2 !== DialogueIntensity.HARSH) throw new Error("Expected HARSH for Master tool");

    console.log("PASS: Intensity scales correctly with mastery.");
}

function testDynamicDialogue() {
    console.log("Testing Dynamic Dialogue Rendering...");

    const data: PersonaData = {
        id: 'rogue',
        name: 'Rogue',
        lines: {
            'fail': {
                [DialogueIntensity.GENTLE]: ["Don't worry, {utility} is hard."],
                [DialogueIntensity.HARSH]: ["You pathetic worm. You still don't know {utility}?"],
            }
        }
    };

    const loader = new PersonaLoader(data);

    // 1. Gentle with variable
    const msg1 = loader.getReaction('fail', { 
        intensity: DialogueIntensity.GENTLE, 
        variables: { utility: 'grep' } 
    });
    console.log("Gentle Output (Expect 'Don't worry, grep is hard.'):", msg1);
    if (msg1 !== "Don't worry, grep is hard.") throw new Error("Template failed for Gentle");

    // 2. Harsh with variable
    const msg2 = loader.getReaction('fail', { 
        intensity: DialogueIntensity.HARSH, 
        variables: { utility: 'grep' } 
    });
    console.log("Harsh Output (Expect 'You pathetic worm. You still don't know grep?'):", msg2);
    if (msg2 !== "You pathetic worm. You still don't know grep?") throw new Error("Template failed for Harsh");

    console.log("PASS: Dynamic templates and intensity selection verified.");
}

async function run() {
    try {
        await testIntensityScaling();
        testDynamicDialogue();
        console.log("ALL TESTS PASS");
    } catch (e) {
        console.error("FAIL:", e);
        process.exit(1);
    }
}

run();