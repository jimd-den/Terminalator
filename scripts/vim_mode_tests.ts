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
    const state = new VimStateEntity('NORMAL');
    const buffer = new EditorBuffer("t.txt", "");
    const cmdMgr = new VimCommandManager(buffer);

    const next1 = mode.handleKey('i', state, buffer, cmdMgr);
    if (next1 !== 'INSERT') throw new Error("Transition to INSERT failed");

    const next2 = mode.handleKey(':', state, buffer, cmdMgr);
    if (next2 !== 'COMMAND') throw new Error("Transition to COMMAND failed");

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

try {
    testNormalModeNavigation();
    testNormalModeTransitions();
    testNormalModeDeletion();
    console.log("\nPHASE 2 TASK 2 PASSED");
} catch (e) {
    console.error(`\nTEST FAILED: ${e}`);
    process.exit(1);
}