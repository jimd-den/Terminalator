import { InsertMode } from '../src/domain/usecases/vim/modes/InsertMode';
import { VimStateEntity } from '../src/domain/entities/vim/VimStateEntity';
import { EditorBuffer } from '../src/domain/entities/EditorBuffer';
import { VimCommandManager } from '../src/domain/usecases/vim/VimCommandManager';

function testInsertModeTyping() {
    console.log("Testing InsertMode typing...");
    const mode = new InsertMode();
    const state = new VimStateEntity('INSERT', { line: 0, col: 0 });
    const buffer = new EditorBuffer("test.txt", "");
    const cmdMgr = new VimCommandManager(buffer);

    mode.handleKey('a', state, buffer, cmdMgr);
    if (buffer.getLine(0) !== "a") throw new Error(`Typing 'a' failed. Got: ${buffer.getLine(0)}`);
    if (state.cursor.col !== 1) throw new Error("Cursor should move after typing");

    console.log("PASS");
}

function testInsertModeBackspace() {
    console.log("Testing InsertMode BACKSPACE...");
    const mode = new InsertMode();
    const state = new VimStateEntity('INSERT', { line: 0, col: 1 });
    const buffer = new EditorBuffer("test.txt", "a");
    const cmdMgr = new VimCommandManager(buffer);

    mode.handleKey('BACKSPACE', state, buffer, cmdMgr);
    if (buffer.getLine(0) !== "") throw new Error("BACKSPACE failed");
    if (state.cursor.col !== 0) throw new Error("Cursor should move back on BACKSPACE");

    console.log("PASS");
}

function testInsertModeEnter() {
    console.log("Testing InsertMode ENTER...");
    const mode = new InsertMode();
    const state = new VimStateEntity('INSERT', { line: 0, col: 1 });
    const buffer = new EditorBuffer("test.txt", "abc");
    const cmdMgr = new VimCommandManager(buffer);

    mode.handleKey('ENTER', state, buffer, cmdMgr);
    if (buffer.length !== 2) throw new Error(`Buffer should have 2 lines. Got: ${buffer.length}`);
    if (buffer.getLine(0) !== "a") throw new Error(`First line should be 'a'. Got: ${buffer.getLine(0)}`);
    if (buffer.getLine(1) !== "bc") throw new Error(`Second line should be 'bc'. Got: ${buffer.getLine(1)}`);
    if (state.cursor.line !== 1 || state.cursor.col !== 0) throw new Error("Cursor should move to next line, col 0");

    console.log("PASS");
}

try {
    testInsertModeTyping();
    testInsertModeBackspace();
    testInsertModeEnter();
    console.log("\nINSERT MODE TDD PASSED");
} catch (e) {
    console.error(`\nTEST FAILED: ${e}`);
    process.exit(1);
}