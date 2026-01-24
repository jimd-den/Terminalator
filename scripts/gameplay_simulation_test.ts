/**
 * gameplay_simulation_test.ts
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Storyteller’s Code (Literate Documentation)
 *
 * Intent:
 * Simulates a realistic "Gameplay Session" where the user (Operator) interacts with the terminal.
 * Verifies that the `AwkInterpreter` refactor integrates correctly with the Shell, FileSystem, and User Context.
 *
 * Scenario:
 * 1. Operator logs in (implied).
 * 2. Checks identity (`whoami`).
 * 3. Creates a system log file.
 * 4. Uses `awk` to analyze the log file (filtering errors).
 * 5. Verifies the output matches expectation.
 */

import { FileSystem } from '../src/domain/entities/FileSystem';
import { FileSystemService } from '../src/domain/services/FileSystemService';
import { createInitialTerminalState } from '../src/domain/entities/TerminalState';
import { ExecuteCommand } from '../src/domain/usecases/ExecuteCommand';
import { ShellFactory } from '../src/domain/factories/ShellFactory';

// --- Configuration ---
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

async function runSimulation() {
    console.log("---------------------------------------------------");
    console.log("  GAMEPLAY SIMULATION: OPERATOR SESSION");
    console.log("---------------------------------------------------");

    // 1. Setup System
    const { executor, fsService, fs, identityService } = ShellFactory.create();

    // 2. Initialize State (The "Boot")
    const state = createInitialTerminalState();
    // Ensure we are the operator
    state.environment['USER'] = 'operator';
    // Ensure CWD is home
    state.currentDirectory = '/home/operator';

    console.log(`[SYS] Boot Complete. User: ${state.environment['USER']}`);

    // --- Helper for execution ---
    async function exec(cmdString: string, description: string): Promise<string> {
        process.stdout.write(`> ${description.padEnd(40)}: `);
        try {
            const result = await executor.execute(cmdString, state);
            if (result.exitCode !== 0) {
                console.log(`${RED}FAIL (Exit ${result.exitCode})${RESET}`);
                console.log(`  Output: ${result.output}`);
                return result.output;
            }
            console.log(`${GREEN}OK${RESET}`);
            if (result.newState) Object.assign(state, result.newState);
            return String(result.output || '');
        } catch (e: any) {
            console.log(`${RED}CRASH${RESET}`);
            console.log(`  Error: ${e.message}`);
            return "ERROR";
        }
    }

    // --- The Session ---

    // Step 1: Verify Identity
    const who = await exec('whoami', 'Check Identity');
    if (who.trim() !== 'operator') {
        console.error(`${RED}FAIL: Expected 'operator', got '${who}'${RESET}`);
    }

    // Step 2: Generate Data (Access Log)
    // We'll use 'echo' to create a log file simulating a game event
    await exec('touch access.log', 'Create Log File');
    await exec('echo "2026-01-24 10:00:01 INFO System Boot" >> access.log', 'Log Entry 1');
    await exec('echo "2026-01-24 10:00:05 WARN High Memory" >> access.log', 'Log Entry 2');
    await exec('echo "2026-01-24 10:01:00 ERROR Unauthorized Access" >> access.log', 'Log Entry 3');
    await exec('echo "2026-01-24 10:02:00 INFO Cleanup" >> access.log', 'Log Entry 4');

    // Step 3: Analyze with AWK (The Refactored Component)
    // "Find the time of the ERROR"
    const analysis = await exec("awk '/ERROR/ {print $2}' access.log", 'Analyze Log (Find Timestamp)');

    if (analysis.trim() === '10:01:00') {
        console.log(`${GREEN}  [VERIFIED] AWK correctly parsed the filtered field.${RESET}`);
    } else {
        console.error(`${RED}  [FAILED] Expected '10:01:00', got '${analysis}'${RESET}`);
    }

    // Step 4: Complex AWK (Variables)
    // "Count number of INFO logs"
    const count = await exec("awk 'BEGIN {c=0} /INFO/ {c=c+1} END {print c}' access.log", 'Count INFO logs');
    if (count.trim() === '2') {
        console.log(`${GREEN}  [VERIFIED] AWK correctly handled variables and arithmetic.${RESET}`);
    } else {
        console.error(`${RED}  [FAILED] Expected '2', got '${count}'${RESET}`);
    }

    console.log("---------------------------------------------------");
}

runSimulation();
