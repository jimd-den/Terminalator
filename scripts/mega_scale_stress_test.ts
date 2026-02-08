import { MissionMotive, MissionVerb, MissionNoun } from '../src/domain/entities/mission/Grammar';
import { MasteryTracker } from '../src/domain/services/tutor/MasteryTracker';
import { PersonaLoader, PersonaData } from '../src/domain/services/tutor/PersonaLoader';
import * as dialogueLibrary from '../src/domain/data/tutor/DialogueLibrary.json';

async function runMegaScaleStressTest() {
    console.log("Starting Mega-Scale Stress Test...");

    const masteryTracker = new MasteryTracker();
    const personaData: PersonaData = { id: 'test', name: 'Tester', lines: (dialogueLibrary as any).structures };
    const loader = new PersonaLoader(personaData, (dialogueLibrary as any).fragments);

    const missionPermutations = new Set<string>();
    const dialoguePermutations = new Set<string>();

    const TARGET = 10000;

    console.log(`Generating ${TARGET} permutations...`);

    for (let i = 0; i < TARGET; i++) {
        // 1. Mission Variety Check (Logical state space)
        // Motives(5) * Verbs(6) * Nouns(5) * Systems(1000) = 75,000 unique mission configs
        const motive = randomEnum(MissionMotive);
        const verb = randomEnum(MissionVerb);
        const noun = randomEnum(MissionNoun);
        const system = `sys-${Math.floor(Math.random() * 1000)}`;
        
        missionPermutations.add(`${motive}:${verb}:${noun}:${system}`);

        // 2. Dialogue Variety Check (Combinatorial space)
        // Fragments: 20 Open * 20 Middle * 20 Close = 8,000 structures per intensity
        // * Fillers(20) * Insults(20) etc. = Millions of strings.
        const msg = loader.getReaction(Math.random() > 0.5 ? 'GENTLE' : 'HARSH', { 
            intensity: Math.random() > 0.5 ? 'GENTLE' : 'HARSH' as any,
            variables: { utility: 'grep' }
        });
        dialoguePermutations.add(msg);

        if (i % 2000 === 0 && i > 0) console.log(` - Progress: ${i}...`);
    }

    console.log("\nSTRESS TEST RESULTS:");
    console.log(` - Unique Mission Logic Keys: ${missionPermutations.size}`);
    console.log(` - Unique Assembled Dialogues: ${dialoguePermutations.size}`);

    const missionDiversity = (missionPermutations.size / TARGET) * 100;
    const dialogueDiversity = (dialoguePermutations.size / TARGET) * 100;

    console.log(` - Mission Diversity: ${missionDiversity.toFixed(2)}%`);
    console.log(` - Dialogue Diversity: ${dialogueDiversity.toFixed(2)}%`);

    if (missionDiversity < 90) {
        throw new Error("FAIL: Mission diversity below 90%");
    }

    if (dialogueDiversity < 95) {
        throw new Error("FAIL: Dialogue diversity below 95%");
    }

    console.log("\nPASS: System successfully scales to 10,000+ permutations with high variety.");
}

function randomEnum<T>(anEnum: T): T[keyof T] {
    const values = Object.values(anEnum as any) as unknown as T[keyof T][];
    return values[Math.floor(Math.random() * values.length)];
}

runMegaScaleStressTest().catch(e => {
    console.error(e);
    process.exit(1);
});
