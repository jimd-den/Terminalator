import { VimStateEntity } from '../src/domain/entities/vim/VimStateEntity';
import { VimInputHandler } from '../src/domain/usecases/vim/VimInputHandler';
import { IVimBuffer } from '../src/domain/entities/vim/IVimBuffer';
import { VimEngine } from '../src/domain/entities/VimEngine';
import { EditorBuffer } from '../src/domain/entities/EditorBuffer';

class MockBuffer implements IVimBuffer {
    public lines: string[];
    constructor(lines: string[]) { this.lines = lines; }
    getLine(index: number): string { return this.lines[index] || ''; }
    updateLine(index: number, content: string): void { this.lines[index] = content; }
    insertLine(index: number, content: string): void { this.lines.splice(index, 0, content); }
    deleteLine(index: number): void { 
        if (this.lines.length > 1) this.lines.splice(index, 1);
        else this.lines = [''];
    }
    splitLine(lineIndex: number, colIndex: number): void {
        const line = this.lines[lineIndex];
        this.lines[lineIndex] = line.slice(0, colIndex);
        this.lines.splice(lineIndex + 1, 0, line.slice(colIndex));
    }
    joinLines(index: number): void {
        this.lines[index] += this.lines[index + 1];
        this.lines.splice(index + 1, 1);
    }
    get length(): number { return this.lines.length; }
    toString(): string { return this.lines.join('\n'); }
}

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
    
    clone.cursor.line = 20;
    if (state.cursor.line === 20) throw new Error("Clone cursor should be deep copied");
    
    console.log("PASS");
}

function testVimInputHandlerModeSwitch() {
    console.log("Testing VimInputHandler mode switching...");
    const handler = new VimInputHandler();
    const state = new VimStateEntity('NORMAL');
    const buffer = new MockBuffer(['hello']);
    
    let nextState = handler.handleKey('i', state, buffer);
    if (nextState.mode !== 'INSERT') throw new Error("Should switch to INSERT mode on 'i'");
    
    nextState = handler.handleKey('ESC', nextState, buffer);
    if (nextState.mode !== 'NORMAL') throw new Error("Should switch to NORMAL mode on 'ESC'");
    
    console.log("PASS");
}

function testVimInputHandlerInsertion() {
    console.log("Testing VimInputHandler character insertion...");
    const handler = new VimInputHandler();
    let state = new VimStateEntity('INSERT');
    const buffer = new MockBuffer(['']);
    
    state = handler.handleKey('a', state, buffer);
    if (buffer.getLine(0) !== 'a') throw new Error(`Expected 'a', got '${buffer.getLine(0)}'`);
    if (state.cursor.col !== 1) throw new Error("Cursor should move after insertion");
    
    state = handler.handleKey('b', state, buffer);
    if (buffer.getLine(0) !== 'ab') throw new Error(`Expected 'ab', got '${buffer.getLine(0)}'`);
    
    console.log("PASS");
}

function testVimEngineDelegation() {
    console.log("Testing VimEngine delegation...");
    const buffer = new EditorBuffer('test.txt', 'hello');
    const engine = new VimEngine(buffer);
    
    engine.handleInput('i');
    if (engine.getState().mode !== 'INSERT') throw new Error("VimEngine should delegate mode switch");
    
    engine.handleInput('!');
    if (buffer.getLine(0) !== '!hello') throw new Error(`VimEngine should delegate insertion. Got: ${buffer.getLine(0)}`);
    
    console.log("PASS");
}

try {
    testVimStateInitialization();
    testVimStateCloning();
    testVimInputHandlerModeSwitch();
    testVimInputHandlerInsertion();
    testVimEngineDelegation();
    console.log("\nALL VIM UNIT TESTS PASSED");
} catch (e) {
    console.error(`\nTEST FAILED: ${e}`);
    process.exit(1);
}