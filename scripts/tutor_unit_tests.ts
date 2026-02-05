import { TutorMessage } from '../src/domain/entities/tutor/TutorMessage';
import { ITutorService } from '../src/domain/services/tutor/ITutorService';
import { TutorService } from '../src/domain/services/tutor/TutorService';

async function testTutorServiceQueue() {
    console.log("Testing TutorService message queue...");
    const service: ITutorService = new TutorService();
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