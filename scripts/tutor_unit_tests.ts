import { TutorMessage } from '../src/domain/entities/tutor/TutorMessage';
import { ITutorMessagingService } from '../src/domain/services/tutor/ITutorMessagingService';
import { TutorMessagingService } from '../src/domain/services/tutor/TutorMessagingService';

async function testTutorMessagingServiceQueue() {
    console.log("Testing TutorMessagingService message queue...");
    const service: ITutorMessagingService = new TutorMessagingService();
    await service.sendMessage("Welcome to the Grid.", "info");
    await service.sendMessage("Stay sharp.", "warn");

    const msg1 = await service.getNextMessage();
    if (!msg1 || msg1.text !== "Welcome to the Grid.") throw new Error("First message mismatch");
    
    console.log("PASS");
}

testTutorMessagingServiceQueue()
    .then(() => console.log("\nALL TUTOR UNIT TESTS PASSED"))
    .catch((e) => {
        console.error(`\nTEST FAILED: ${e}`);
        process.exit(1);
    });
