
import { FileSystem } from '../src/domain/entities/FileSystem';
import { TerminalState, createInitialTerminalState } from '../src/domain/entities/TerminalState';
import { ExecuteCommand } from '../src/domain/usecases/ExecuteCommand';
import { FileSystemService } from '../src/domain/services/FileSystemService';

async function verify() {
    console.log("=== Verifying Dot Command Return ===");

    const fs = new FileSystem();
    const service = new FileSystemService(fs);
    const state = createInitialTerminalState();

    // Setup dirs
    service.mkdir('/home');
    service.mkdir('/home/operator');

    // Create a script that returns 42
    service.writeFile('/home/operator/script.sh', 'echo executing; return 42; echo fail', 'w'); // 'fail' should not override exitCode if return works
    // Actually return stops execution? Yes.

    const executor = new ExecuteCommand(service);

    // Execute: . script.sh
    const response = await executor.execute('. script.sh', state);

    console.log(`Exit Code: ${response.exitCode}`);
    console.log(`Output: ${response.output}`);

    if (response.exitCode === 42) {
        console.log("[PASS] Dot command propagated return value");
    } else {
        console.error(`[FAIL] Expected exit code 42, got ${response.exitCode}`);
    }
}

verify().catch(console.error);
