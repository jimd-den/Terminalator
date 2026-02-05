import { EditorBuffer } from '../src/domain/entities/EditorBuffer';
import { InsertCharCommand } from '../src/domain/entities/vim/commands/InsertCharCommand';
import { DeleteCharCommand } from '../src/domain/entities/vim/commands/DeleteCharCommand';
import { CommandHistory } from '../src/domain/usecases/vim/CommandHistory';

function testInsertCharCommand() {
    console.log("Testing InsertCharCommand...");
    const buffer = new EditorBuffer("test.txt", "hello");
    const cmd = new InsertCharCommand(buffer, "!", 0, 5);
    
    cmd.execute();
    if (buffer.getLine(0) !== "hello!") throw new Error(`Insert failed. Got: ${buffer.getLine(0)}`);
    
    cmd.undo();
    if (buffer.getLine(0) !== "hello") throw new Error(`Undo insert failed. Got: ${buffer.getLine(0)}`);
    
    console.log("PASS");
}

function testDeleteCharCommand() {
    console.log("Testing DeleteCharCommand...");
    const buffer = new EditorBuffer("test.txt", "hello");
    const cmd = new DeleteCharCommand(buffer, 0, 0); // Delete 'h'
    
    cmd.execute();
    if (buffer.getLine(0) !== "ello") throw new Error(`Delete failed. Got: ${buffer.getLine(0)}`);
    
    cmd.undo();
    if (buffer.getLine(0) !== "hello") throw new Error(`Undo delete failed. Got: ${buffer.getLine(0)}`);
    
    console.log("PASS");
}

function testCommandHistory() {
    console.log("Testing CommandHistory...");
    const buffer = new EditorBuffer("test.txt", "");
    const history = new CommandHistory();
    
    const cmd1 = new InsertCharCommand(buffer, "a", 0, 0);
    const cmd2 = new InsertCharCommand(buffer, "b", 0, 1);
    
    cmd1.execute(); history.push(cmd1);
    cmd2.execute(); history.push(cmd2);
    
    if (buffer.getLine(0) !== "ab") throw new Error("Sequential execution failed");
    
    history.undo();
    if (buffer.getLine(0) !== "a") throw new Error("Undo 1 failed");
    
    history.undo();
    if (buffer.getLine(0) !== "") throw new Error("Undo 2 failed");
    
    history.redo();
    if (buffer.getLine(0) !== "a") throw new Error("Redo 1 failed");
    
    console.log("PASS");
}

try {
    testInsertCharCommand();
    testDeleteCharCommand();
    testCommandHistory();
    console.log("\nPHASE 1 TASK 1 & 2 PASSED");
} catch (e) {
    console.error(`\nTEST FAILED: ${e}`);
    process.exit(1);
}