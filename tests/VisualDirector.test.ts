import { VisualPriority } from '../src/interface-adapters/ui/VisualCortex/VisualPriority';
// @ts-ignore - Module will be created
import { useVisualDirector } from '../src/interface-adapters/ui/VisualCortex/useVisualDirector';

async function testVisualDirector() {
    console.log("Testing VisualDirector...");
    
    // Access the vanilla store API attached to the hook
    const store = useVisualDirector as any;
    if (!store.getState || !store.setState) {
        throw new Error("useVisualDirector does not expose vanilla store API");
    }

    const { getState, setState } = store;

    // Reset state
    setState({ focusOwner: null, currentPriority: 0, reducedMotion: false });

    // Test 1: Request Focus
    // requestFocus(id: string, priority: VisualPriority): boolean
    console.log("Test 1: Request Focus (FOCUS)");
    const success = getState().requestFocus('tutor', VisualPriority.FOCUS);
    if (!success) throw new Error("Failed to acquire focus for Tutor (FOCUS)");
    if (getState().focusOwner !== 'tutor') throw new Error(`Focus owner mismatch. Expected 'tutor', got '${getState().focusOwner}'`);
    if (getState().currentPriority !== VisualPriority.FOCUS) throw new Error("Priority mismatch");

    // Test 2: Lower priority request (should fail)
    console.log("Test 2: Lower Priority Request (AMBIENT)");
    const fail = getState().requestFocus('particles', VisualPriority.AMBIENT);
    if (fail) throw new Error("Lower priority (AMBIENT) should not override FOCUS");
    if (getState().focusOwner !== 'tutor') throw new Error("Focus owner changed incorrectly");

    // Test 3: Higher priority request (should succeed)
    console.log("Test 3: Higher Priority Request (CRITICAL)");
    const critical = getState().requestFocus('system', VisualPriority.CRITICAL);
    if (!critical) throw new Error("CRITICAL should override FOCUS");
    if (getState().focusOwner !== 'system') throw new Error(`Focus owner mismatch. Expected 'system', got '${getState().focusOwner}'`);

    // Test 4: Same priority request (should fail if locked) - assuming exclusive lock
    // Or maybe allow if same owner?
    // Let's assume strict locking for now. 
    // Spec says: "Director grants or denies permission based on current focusOwner and priority."

    // Test 5: Release Focus
    console.log("Test 5: Release Focus");
    // releaseFocus(id: string)
    getState().releaseFocus('system');
    if (getState().focusOwner !== null) throw new Error("Focus should be null after release");
    if (getState().currentPriority !== 0) throw new Error("Priority should reset to 0");

    // Test 6: Wrong owner release (should be ignored)
    getState().requestFocus('tutor', VisualPriority.FOCUS);
    getState().releaseFocus('hacker');
    if (getState().focusOwner !== 'tutor') throw new Error("Focus released by wrong owner");

    console.log("PASS");
}

testVisualDirector().catch(e => {
    console.error(`FAIL: ${e.message}`);
    process.exit(1);
});
