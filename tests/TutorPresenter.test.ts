
import { TutorMessage } from '../src/domain/entities/tutor/TutorMessage';
// @ts-ignore
import { TutorPresenter } from '../src/interface-adapters/presenters/TutorPresenter';

async function testTutorPresenter() {
    console.log("Testing TutorPresenter...");

    // Mock SharedValue
    const visibility: { value: number } = { value: 0 };
    const opacity: { value: number } = { value: 0 };
    
    const presenter = new TutorPresenter(visibility, opacity);

    // Test 1: Present Message
    console.log("Test 1: Present Message");
    const msg: TutorMessage = {
        text: "Hello World",
        type: "info",
        sender: "TUTOR",
        timestamp: Date.now()
    };

    presenter.presentMessage(msg);
    if (visibility.value !== 1) throw new Error("Visibility should be 1 after presenting message");

    // Test 2: Dismiss
    console.log("Test 2: Dismiss");
    presenter.dismiss();
    if ((visibility.value as number) !== 0) throw new Error("Visibility should be 0 after dismissal");

    // Test 3: Throttling (Simulated)
    // If we call presentMessage multiple times fast, it should handle it.
    // In a real scenario, it might queue them or ignore them if already showing.
    
    console.log("PASS");
}

testTutorPresenter().catch(e => {
    console.error(`FAIL: ${e.message}`);
    process.exit(1);
});
