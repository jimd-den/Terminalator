import { MotionStrategy } from '../src/domain/usecases/vim/MotionStrategy';
import { EditorBuffer } from '../src/domain/entities/EditorBuffer';

function testFindNextWordStart() {
    console.log("Testing findNextWordStart...");
    const buffer = new EditorBuffer("test.txt", "hello world  test");
    
    // At 'h' (0,0), next word 'world' starts at (0,6)
    const pos1 = MotionStrategy.findNextWordStart(buffer, 0, 0);
    if (pos1.col !== 6) throw new Error(`Expected col 6, got ${pos1.col}`);

    // At 'd' (0,10), next word 'test' starts at (0,13)
    const pos2 = MotionStrategy.findNextWordStart(buffer, 0, 10);
    if (pos2.col !== 13) throw new Error(`Expected col 13, got ${pos2.col}`);

    console.log("PASS");
}

function testFindEndOfLine() {
    console.log("Testing findEndOfLine...");
    const buffer = new EditorBuffer("test.txt", "abc");
    const pos = MotionStrategy.findEndOfLine(buffer, 0);
    if (pos.col !== 2) throw new Error(`Expected col 2, got ${pos.col}`);
    console.log("PASS");
}

try {
    testFindNextWordStart();
    testFindEndOfLine();
    console.log("\nMOTION STRATEGY TDD PASSED");
} catch (e) {
    console.error(`\nTEST FAILED: ${e}`);
    process.exit(1);
}