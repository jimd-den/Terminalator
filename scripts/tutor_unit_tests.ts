import { TutorMessage } from '../src/domain/entities/tutor/TutorMessage';
import { ITutorService } from '../src/domain/services/tutor/ITutorService';

class MockTutorService implements ITutorService {
    private queue: TutorMessage[] = [];
    async sendMessage(text: string, type: 'info' | 'warn' | 'hint' = 'info'): Promise<void> {
        this.queue.push({ text, type, timestamp: Date.now() });
    }
    async getNextMessage(): Promise<TutorMessage | null> {
        return this.queue.shift() || null;
    }
    async getAllMessages(): Promise<TutorMessage[]> {
        return [...this.queue];
    }
}

async function testTutorServiceQueue() {
    console.log("Testing ITutorService message queue...");
    const service = new MockTutorService();
    await service.sendMessage("Welcome to the Grid.", "info");
    await service.sendMessage("Stay sharp.", "warn");

    const msg1 = await service.getNextMessage();
    if (!msg1 || msg1.text !== "Welcome to the Grid.") throw new Error("First message mismatch");
    
    console.log("PASS");
}

testTutorServiceQueue()
    .then(() => console.log("\nALL TUTOR UNIT TESTS PASSED"))
    .catch((e) => {
        console.error(`\nTEST FAILED: ${e}`);
        process.exit(1);
    });