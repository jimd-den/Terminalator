
import { TutorBrain } from '../src/domain/entities/tutor/TutorBrain';
import { ITutorPersona } from '../src/domain/entities/tutor/ITutorPersona';

class MockPersona implements ITutorPersona {
    id = 'mock';
    name = 'Mock';
    lastEvent: string = '';
    getReaction(event: string) { 
        this.lastEvent = event;
        return `Mock: ${event}`; 
    }
}

class MockTutorEngine {
    listeners: any[] = [];
    subscribe(l: any) {
        this.listeners.push(l);
        return () => {};
    }
    emit(event: any) {
        this.listeners.forEach(l => l(event));
    }
}

class MockGameManager {
    listeners: any[] = [];
    tutorEngine = new MockTutorEngine();
    subscribeToEvents(l: any) {
        this.listeners.push(l);
        return () => {};
    }
    emit(event: string, payload?: any) {
        this.listeners.forEach(l => l(event, payload));
    }
}

function testBrainObservation() {
    console.log("Testing TutorBrain observation of GameManager...");
    const mockBus = { subscribe: () => {}, emit: () => {} } as any;
    const mockIntensityCalculator = { calculate: () => 'GENTLE' } as any;
    const mockIntentInterpreter = {} as any;
    const brain = new TutorBrain(mockIntensityCalculator, mockIntentInterpreter, mockBus);
    const persona = new MockPersona();
    const gm = new MockGameManager();
    
    brain.setPersona(persona);
    
    let receivedText = '';
    brain.subscribe((text) => {
        receivedText = text;
    });

    brain.observe(gm as any);
    
    // Mock random to ensure it speaks
    const originalRandom = Math.random;
    Math.random = () => 0.01;

    gm.emit('COMMAND_EXECUTED', { output: 'test', exitCode: 0 });
    
    Math.random = originalRandom;

    if (persona.lastEvent !== 'COMMAND_EXECUTED') {
        throw new Error("Brain did not observe COMMAND_EXECUTED");
    }

    if (!receivedText.startsWith('Mock:')) {
        throw new Error("Brain did not emit reaction");
    }
    
    console.log("PASS");
}

function testBrainRandomChance() {
    console.log("Testing TutorBrain 30% random chance...");
    const mockBus = { subscribe: () => {}, emit: () => {} } as any;
    const mockIntensityCalculator = { calculate: () => 'GENTLE' } as any;
    const mockIntentInterpreter = {} as any;
    const brain = new TutorBrain(mockIntensityCalculator, mockIntentInterpreter, mockBus);
    const persona = new MockPersona();
    const gm = new MockGameManager();
    
    brain.setPersona(persona);
    brain.observe(gm as any);

    let reactionCount = 0;
    brain.subscribe(() => {
        reactionCount++;
    });

    // Mock Math.random
    const originalRandom = Math.random;
    
    // Test Case 1: Math.random() = 0.1 (Should speak)
    Math.random = () => 0.1;
    gm.emit('COMMAND_EXECUTED', { output: 'test', exitCode: 0 });
    
    // Test Case 2: Math.random() = 0.5 (Should NOT speak)
    Math.random = () => 0.5;
    gm.emit('COMMAND_EXECUTED', { output: 'test', exitCode: 0 });

    Math.random = originalRandom;

    if (reactionCount !== 1) {
        throw new Error(`Expected 1 reaction, got ${reactionCount} (EXPECTED RED PHASE)`);
    }
    
    console.log("PASS");
}

function testBrainTutorEngineEvents() {
    console.log("Testing TutorBrain observation of TutorEngine...");
    const mockBus = { subscribe: () => {}, emit: () => {} } as any;
    const mockIntensityCalculator = { calculate: () => 'GENTLE' } as any;
    const mockIntentInterpreter = {} as any;
    const brain = new TutorBrain(mockIntensityCalculator, mockIntentInterpreter, mockBus);
    const persona = new MockPersona();
    const gm = new MockGameManager();
    
    brain.setPersona(persona);
    brain.observe(gm as any);

    let reactions: any[] = [];
    brain.subscribe((text, type) => {
        reactions.push({ text, type });
    });

    gm.tutorEngine.emit({ type: 'MISTAKE', payload: {} });
    
    if (reactions.length === 0) {
        throw new Error("Brain did not react to MISTAKE");
    }
    
    if (reactions[0].type !== 'warn') {
        throw new Error(`Expected warn type for MISTAKE, got ${reactions[0].type}`);
    }

    // Test START event
    reactions = [];
    gm.tutorEngine.emit({ type: 'START', payload: { instructions: 'TEST INSTR' } });
    
    if (reactions.length !== 2) {
        throw new Error(`Expected 2 reactions for START, got ${reactions.length}`);
    }
    
    if (!reactions[0].text.includes('MISSION DATA UPLOADED: TEST INSTR')) {
        throw new Error("Missing mission data upload message");
    }

    console.log("PASS");
}

try {
    testBrainObservation();
    testBrainRandomChance();
    testBrainTutorEngineEvents();
    console.log("\nPHASE 1 TASK 1, 2 & 3 TESTS PASSED");
} catch (e) {
    console.error(`\nTEST FAILED: ${e}`);
    process.exit(1);
}
