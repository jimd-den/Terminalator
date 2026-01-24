
import { ShellFactory } from '../src/domain/factories/ShellFactory';
import { createInitialTerminalState } from '../src/domain/entities/TerminalState';
import { FileSystemService } from '../src/domain/services/FileSystemService';

async function runTest() {
    console.log(">>> Starting Scheme Verification...");

    const { executor, fsService } = ShellFactory.create();
    const state = createInitialTerminalState();

    // Ensure home exists
    fsService.mkdirp('/home/operator');

    // 1. Test Direct Expression (-e)
    console.log("[Test] Running: scheme -e '(+ 1 2 3)'");
    let res = await executor.execute("scheme -e '(+ 1 2 3)'", state);
    console.log(`Output: [${res.output.trim()}] Exit: ${res.exitCode}`);

    if (res.exitCode !== 0 || res.output.trim() !== '6') {
        console.error("FAILED: Expression evaluation incorrect.");
        process.exit(1);
    }

    // 2. Test File Execution
    console.log("[Test] Creating factorial.scm...");
    const script = `
    (define (factorial n)
      (if (= n 0)
          1
          (* n (factorial (- n 1)))))
    (factorial 5)
    `;
    fsService.writeFile('/home/operator/factorial.scm', script);

    console.log("[Test] Running: scheme factorial.scm");
    res = await executor.execute("scheme factorial.scm", state);
    console.log(`Output: [${res.output.trim()}] Exit: ${res.exitCode}`);

    if (res.exitCode !== 0 || res.output.trim() !== '120') {
        process.exit(1);
    }

    /*
    // 3. Test Shebang Execution (Optional advanced feature)
    // Needs ExecuteCommand to handle .scm files if marked executable and containing #!
    console.log("[Test] Shebang execution...");
    const shebangScript = `#!/usr/bin/env scheme
    (display "Hello from Shebang")
    (newline)
    `;
    fsService.writeFile('/home/operator/hello.scm', shebangScript);
    fsService.chmod('/home/operator/hello.scm', 0o755);
    
    // This requires ExecuteCommand to support shebang parsing for non-binary files
    // Currently ExecuteCommand supports 'sh' by default for text files?
    // Let's see if we can run it.
    */

    console.log(">>> SCHEME VERIFICATION PASSED");
}

runTest().catch(e => {
    console.error(e);
    process.exit(1);
});
