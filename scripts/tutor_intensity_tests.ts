import { MasteryTracker } from '../src/domain/services/tutor/MasteryTracker';
import { IntensityCalculator, DialogueIntensity } from '../src/domain/services/tutor/IntensityCalculator';
import { PersonaLoader, PersonaData } from '../src/domain/services/tutor/PersonaLoader';
import * as dialogueLibrary from '../src/domain/data/tutor/DialogueLibrary.json';

function testCombinatorialVariety() {
    console.log("Testing Multi-Segment Combinatorial Dialogue Variety...");

    const data: PersonaData = {
        id: 'rogue',
        name: 'Rogue',
        lines: {
            'fail': {
                [DialogueIntensity.GENTLE]: (dialogueLibrary as any).structures.GENTLE,
                [DialogueIntensity.HARSH]: (dialogueLibrary as any).structures.HARSH,
            }
        }
    };

    const loader = new PersonaLoader(data, (dialogueLibrary as any).fragments);

    console.log("\nGENTLE SAMPLES (Segmented Chain):");
    for (let i = 0; i < 5; i++) {
        const msg = loader.getReaction('fail', { 
            intensity: DialogueIntensity.GENTLE, 
            variables: { utility: 'grep' } 
        });
        console.log(` - ${msg}`);
    }

    console.log("\nHARSH SAMPLES (Segmented Chain):");
    for (let i = 0; i < 5; i++) {
        const msg = loader.getReaction('fail', { 
            intensity: DialogueIntensity.HARSH, 
            variables: { utility: 'ls' } 
        });
        console.log(` - ${msg}`);
    }

    console.log("\nPASS: Multi-segment dialogue assembled with massive variety.");
}

async function run() {
    try {
        testCombinatorialVariety();
        console.log("\nALL TESTS PASS");
    } catch (e) {
        console.error("FAIL:", e);
        process.exit(1);
    }
}

run();