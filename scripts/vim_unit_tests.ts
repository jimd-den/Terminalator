import { VimStateEntity } from '../src/domain/entities/vim/VimStateEntity';
import { VimInputHandler } from '../src/domain/usecases/vim/VimInputHandler';
import { VimCommandManager } from '../src/domain/usecases/vim/VimCommandManager';
import { IVimBuffer } from '../src/domain/entities/vim/IVimBuffer';
import { VimEngine } from '../src/domain/entities/VimEngine';
import { EditorBuffer } from '../src/domain/entities/EditorBuffer';
import { VimSimulator } from '../src/interface-adapters/VimSimulator';
import { FileSystem } from '../src/domain/entities/FileSystem';
import { FileSystemService } from '../src/domain/services/FileSystemService';

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

function testVimInputHandlerModeSwitch() {
    console.log("Testing VimInputHandler mode switching...");
    const handler = new VimInputHandler();
    const state = new VimStateEntity('NORMAL');
    const buffer = new MockBuffer(['hello']);
    const commands = new VimCommandManager(buffer);
    
    let nextState = handler.handleKey('i', state, buffer, commands);
    if (nextState.mode !== 'INSERT') throw new Error("Should switch to INSERT mode on 'i'");
    
    nextState = handler.handleKey('ESC', nextState, buffer, commands);
    if (nextState.mode !== 'NORMAL') throw new Error("Should switch to NORMAL mode on 'ESC'");
    
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

function testVimSimulatorCustomCommands() {
    console.log("Testing VimSimulator custom commands...");
    const fs = new FileSystem();
    const service = new FileSystemService(fs);
    const simulator = new VimSimulator(service, 'test.txt');

    const exitResult = simulator.executeCommand(':exit');
    if (!exitResult.exit) throw new Error("Expected exit to be true for :exit");
    
    const quitResult = simulator.executeCommand(':q');
    if (!quitResult.exit) throw new Error("Expected exit to be true for :q");

    console.log("PASS");
}

try {
    testVimStateInitialization();
    testVimInputHandlerModeSwitch();
    testVimEngineDelegation();
    testVimSimulatorCustomCommands();
    console.log("\nALL VIM UNIT TESTS PASSED");
} catch (e) {
    console.error(`\nTEST FAILED: ${e}`);
    process.exit(1);
}
