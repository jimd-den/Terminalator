(global as any).__DEV__ = true;

import { TutorBrain } from '../../src/domain/entities/tutor/TutorBrain';
import { TutorMessagingService } from '../../src/domain/services/tutor/TutorMessagingService';
import { PersonaLoader } from '../../src/domain/services/tutor/PersonaLoader';

// Mock Persona Data
const mockPersona = {
    id: 'test',
    name: 'TestTutor',
    lines: {
        GREETING: ['Hello world'],
        COMMAND_GENERIC: ['Good command'],
        ERROR_LOW: ['Bad command'],
        MISSION_START: ['Lets go']
    },
    config: {
        commentChance: 1.0 // Force comment for testing
    }
};

class MockGameManager {
    listeners: any[] = [];
    tutorEngine = {
        subscribe: (l: any) => () => {}
    };
    subscribeToEvents(l: any) {
        this.listeners.push(l);
        return () => {};
    }
    emit(event: string, payload?: any) {
        this.listeners.forEach(l => l(event, payload));
    }
}

async function verifyLogicMigration() {
    console.log("=== Manual Verification: Logic Migration (Humble Object) ===");

    const gm = new MockGameManager();
    
    const brain = new TutorBrain();
    brain.setPersona(new PersonaLoader(mockPersona as any));
    
    const messagingService = new TutorMessagingService();

    // 2. Wire up (as useTutorMessagingController would)
    console.log("[SETUP] Wiring Brain to Game and Messaging Service...");
    brain.observe(gm as any);
    brain.subscribe((text, type) => {
        console.log(`[BRAIN EVENT] -> [MESSAGING SERVICE]: ${text} (${type})`);
        messagingService.sendMessage(text, type as any, brain.activePersona.name);
    });

    // 3. Trigger Game Event
    console.log("[ACTION] Triggering COMMAND_EXECUTED (Success)...");
    
    const originalRandom = Math.random;
    Math.random = () => 0.1;
    
    gm.emit('COMMAND_EXECUTED', { output: 'Success', exitCode: 0 });

    // Verify messaging service has the message
    const messages = await messagingService.getAllMessages();
    if (messages.length > 0) {
        console.log(`[SUCCESS] Messaging Service received: "${messages[0].text}"`);
    } else {
        Math.random = originalRandom;
        throw new Error("Messaging Service did not receive success message");
    }

    // 4. Trigger Error Event
    console.log("[ACTION] Triggering COMMAND_EXECUTED (Error)...");
    gm.emit('COMMAND_EXECUTED', { output: 'Fail', exitCode: 1 });

    Math.random = originalRandom;

    const allMessages = await messagingService.getAllMessages();
    const lastMessage = allMessages[allMessages.length - 1];
    if (lastMessage && lastMessage.type === 'warn') {
        console.log(`[SUCCESS] Messaging Service received error warning: "${lastMessage.text}"`);
    } else {
        throw new Error("Messaging Service did not receive error warning");
    }

    console.log("=== Manual Verification Passed ===");
}

verifyLogicMigration().catch(e => {
    console.error(`[FAIL] Verification Failed: ${e}`);
    process.exit(1);
});