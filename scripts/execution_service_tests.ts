import { LanguageExecutionService } from '../src/domain/services/LanguageExecutionService';
import { FileSystemService } from '../src/domain/services/FileSystemService';
import { FileSystem } from '../src/domain/entities/FileSystem';

async function testExecution() {
    console.log("Testing LanguageExecutionService...");
    const fs = new FileSystem();
    const fsService = new FileSystemService(fs);
    const service = new LanguageExecutionService(fsService);

    // Setup Scheme file
    fsService.writeFile('/hello.scm', '(display "Hello World")', 'w');

    // Execute
    const result = await service.execute('/hello.scm');
    
    if (result.exitCode !== 0) throw new Error("Expected exit code 0");
    if (result.output.trim() !== 'Hello World') throw new Error(`Expected 'Hello World', got '${result.output}'`);

    console.log("PASS");
}

testExecution()
    .then(() => console.log("\\nALL EXECUTION TESTS PASSED"))
    .catch((e) => {
        console.error(`\\nTEST FAILED: ${e}`);
        process.exit(1);
    });
