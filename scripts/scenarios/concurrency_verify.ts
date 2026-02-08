
import { TutorMessagingService } from '../../src/domain/services/tutor/TutorMessagingService';

async function verifyConcurrency() {
    console.log("=== Manual Verification: Concurrency & Queueing ===");

    const service = new TutorMessagingService();
    const receivedMessages: string[] = [];

    // Simulate UI Consumer (similar to GameContext logic)
    let isProcessing = false;
    const processQueue = async () => {
        if (isProcessing) return;
        isProcessing = true;

        let msg = await service.getNextMessage();
        while (msg) {
            console.log(`[CONSUMER] Processing: "${msg.text}"`);
            // Simulate typing delay
            await new Promise(r => setTimeout(r, 100));
            
            receivedMessages.push(msg.text);
            console.log(`[CONSUMER] Displayed: "${msg.text}"`);

            msg = await service.getNextMessage();
        }
        isProcessing = false;
    };

    service.subscribe(() => {
        processQueue();
    });

    // 1. Rapid Fire Messages
    console.log("[ACTION] Sending 3 messages rapidly...");
    service.sendMessage("Message 1");
    service.sendMessage("Message 2");
    service.sendMessage("Message 3");

    // Wait for consumer to finish
    await new Promise(r => setTimeout(r, 1000));

    console.log(`Received count: ${receivedMessages.length}`);
    if (receivedMessages.length === 3 && receivedMessages[0] === "Message 1") {
        console.log("=== Manual Verification Passed ===");
    } else {
        throw new Error(`Verification Failed: Expected 3 ordered messages, got ${receivedMessages}`);
    }
}

verifyConcurrency().catch(e => {
    console.error(`
[FAIL] Verification Failed: ${e}`);
    process.exit(1);
});
