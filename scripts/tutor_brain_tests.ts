import { TutorBrain } from '../src/domain/entities/tutor/TutorBrain';
import { ITutorPersona } from '../src/domain/entities/tutor/ITutorPersona';

class MockPersona implements ITutorPersona {
    id = 'mock';
    name = 'Mock';
    getReaction(event: string) { return `Mock: ${event}`; }
}

function testBrain() {
    console.log("Testing TutorBrain...");
    const mockBus = { subscribe: () => {}, emit: () => {} } as any;
    const mockIntensityCalculator = { calculate: () => 'GENTLE' } as any;
    const mockIntentInterpreter = {} as any;
    const brain = new TutorBrain(mockIntensityCalculator, mockIntentInterpreter, mockBus);
    const persona = new MockPersona();
    
    brain.setPersona(persona);
    if (brain.activePersona.id !== 'mock') throw new Error("Failed to set persona");
    
    console.log("PASS");
}

try {
    testBrain();
    console.log("\\nALL TUTOR BRAIN TESTS PASSED");
} catch (e) {
    console.error(`\\nTEST FAILED: ${e}`);
    process.exit(1);
}