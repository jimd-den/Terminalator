import { VimStateEntity } from '../src/domain/entities/vim/VimStateEntity';

function testVimStateInitialization() {
    console.log("Testing VimStateEntity initialization...");
    const state = new VimStateEntity();
    if (state.mode !== 'NORMAL') throw new Error("Default mode should be NORMAL");
    if (state.cursor.line !== 0 || state.cursor.col !== 0) throw new Error("Default cursor should be at (0,0)");
    console.log("PASS");
}

function testVimStateCloning() {
    console.log("Testing VimStateEntity cloning...");
    const state = new VimStateEntity('INSERT', { line: 5, col: 10 });
    const clone = state.clone();
    
    if (clone.mode !== 'INSERT') throw new Error("Clone mode should match");
    if (clone.cursor.line !== 5 || clone.cursor.col !== 10) throw new Error("Clone cursor should match");
    
    // Ensure deep copy of cursor
    clone.cursor.line = 20;
    if (state.cursor.line === 20) throw new Error("Clone cursor should be deep copied");
    
    console.log("PASS");
}

try {
    testVimStateInitialization();
    testVimStateCloning();
    console.log("\nALL VIM UNIT TESTS PASSED");
} catch (e) {
    console.error(`\nTEST FAILED: ${e}`);
    process.exit(1);
}