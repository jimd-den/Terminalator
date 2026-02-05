import { NormalMode } from '../src/domain/usecases/vim/modes/NormalMode';
import { VimStateEntity } from '../src/domain/entities/vim/VimStateEntity';
import { EditorBuffer } from '../src/domain/entities/EditorBuffer';
import { VimCommandManager } from '../src/domain/usecases/vim/VimCommandManager';

function testNormalModeNavigation() {
    console.log("Testing NormalMode navigation...");
    const mode = new NormalMode();
    const state = new VimStateEntity('NORMAL', { line: 0, col: 0 });
    const buffer = new EditorBuffer("test.txt", "line1\nline2");
    const cmdMgr = new VimCommandManager(buffer);

    mode.handleKey('j', state, buffer, cmdMgr);
    if (state.cursor.line !== 1) throw new Error("Move down failed");

    mode.handleKey('l', state, buffer, cmdMgr);
    if (state.cursor.col !== 1) throw new Error("Move right failed");

    console.log("PASS");
}

function testNormalModeTransitions() {
    console.log("Testing NormalMode transitions...");
    const mode = new NormalMode();
    const state = new VimStateEntity('NORMAL', { line: 0, col: 0 });
    const buffer = new EditorBuffer("t.txt", "abc");
    const cmdMgr = new VimCommandManager(buffer);

    const next1 = mode.handleKey('i', state, buffer, cmdMgr);
    if (next1 !== 'INSERT') throw new Error("Transition to INSERT failed");

    const next2 = mode.handleKey(':', state, buffer, cmdMgr);
    if (next2 !== 'COMMAND') throw new Error("Transition to COMMAND failed");

    const next3 = mode.handleKey('a', state, buffer, cmdMgr);
    if (next3 !== 'INSERT') throw new Error("Transition to INSERT via 'a' failed");
    if (state.cursor.col !== 1) throw new Error(`Cursor should move right on 'a'. Got: ${state.cursor.col}`);

    console.log("PASS");
}

function testNormalModeDeletion() {
    console.log("Testing NormalMode deletion (x)...");
    const mode = new NormalMode();
    const state = new VimStateEntity('NORMAL', { line: 0, col: 0 });
    const buffer = new EditorBuffer("test.txt", "hello");
    const cmdMgr = new VimCommandManager(buffer);

    mode.handleKey('x', state, buffer, cmdMgr);
    if (buffer.getLine(0) !== "ello") throw new Error("Deletion failed");

    mode.handleKey('u', state, buffer, cmdMgr);
    if (buffer.getLine(0) !== "hello") throw new Error("Undo via 'u' failed");

    console.log("PASS");
}

function testNormalModeWordMovement() {
    console.log("Testing NormalMode word movement (w)...");
    const mode = new NormalMode();
    const state = new VimStateEntity('NORMAL', { line: 0, col: 0 });
    const buffer = new EditorBuffer("test.txt", "hello world");
    const cmdMgr = new VimCommandManager(buffer);

    mode.handleKey('w', state, buffer, cmdMgr);
    if (state.cursor.col !== 6) throw new Error(`Expected col 6 after 'w'. Got: ${state.cursor.col}`);
    
    console.log("PASS");
}

function testNormalModeDeleteMotion() {
    console.log("Testing NormalMode delete motion (dw, d$)...");
    const mode = new NormalMode();
    const buffer = new EditorBuffer("test.txt", "hello world");
    const cmdMgr = new VimCommandManager(buffer);
    const state = new VimStateEntity('NORMAL', { line: 0, col: 0 });

    // dw
    mode.handleKey('d', state, buffer, cmdMgr);
    if (state.pendingAction !== 'DELETE') throw new Error("Should set pendingAction to DELETE");
    mode.handleKey('w', state, buffer, cmdMgr);
    if (buffer.getLine(0) !== "world") throw new Error(`dw failed. Got: ${buffer.getLine(0)}`);

    // d$
    state.cursor.col = 1; // at 'o' in 'world'
    mode.handleKey('d', state, buffer, cmdMgr);
    mode.handleKey('$', state, buffer, cmdMgr);
    if (buffer.getLine(0) !== "w") throw new Error(`d$ failed. Got: ${buffer.getLine(0)}`);

    console.log("PASS");
}

try {
    testNormalModeNavigation();
    testNormalModeTransitions();
    testNormalModeDeletion();
    testNormalModeWordMovement();
    testNormalModeDeleteMotion();
    console.log("\nPHASE 2 TASK 2 PASSED");
} catch (e) {
    console.error(`\nTEST FAILED: ${e}`);
    process.exit(1);
}