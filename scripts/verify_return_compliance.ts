/**
 * verify_return_compliance.ts
 * 
 * Test Suite for 'return' utility compliance.
 * Focus: Control flow interruption, exit code preservation.
 */

import { ExecuteCommand } from '../src/domain/usecases/ExecuteCommand';
import { TerminalState, createInitialTerminalState } from '../src/domain/entities/TerminalState';
import { FileSystem } from '../src/domain/entities/FileSystem';
import { ShellParser } from '../src/domain/services/ShellParser';
import { ReturnCommand } from '../src/domain/commands/core/ReturnCommand';

async function runTests() {
    let passed = 0;
    let run = 0;
    const fs = new FileSystem();
    // Setup state
    const state = createInitialTerminalState();
    // Inject test FS if needed, though createInitialTerminalState makes its own.
    // For ExecuteCommand, checking if we need to pass fs to it.
    const executor = new ExecuteCommand(fs); // Should use updated parser internally

    const assert = async (cmd: string, expectedExit: number, desc: string, shouldRunSecondHalf: boolean = false) => {
        run++;
        // We need to capture if the second part of a sequence runs.
        // e.g. "return 5; echo FAIL" -> echo should NOT run.

        let outputBuffer = "";
        // Mock stdout capture? ExecuteCommand returns output string.

        const res = await executor.execute(cmd, state);

        let fail = false;
        if (res.exitCode !== expectedExit) {
            console.error(`[FAIL] ${desc}: Exit code ${res.exitCode} != ${expectedExit}`);
            fail = true;
        }

        // Logic check: If cmd was "return; echo FAIL", output should not contain FAIL
        if (!shouldRunSecondHalf && res.output.includes("FAIL")) {
            console.error(`[FAIL] ${desc}: Execution continued after return!`);
            fail = true;
        }

        if (!fail) passed++;
    };

    console.log("=== Return Compliance Suite ===");

    // 1. Basic Exit Codes
    await assert("return 0", 0, "Return 0");
    await assert("return 1", 1, "Return 1");
    // await assert("return 255", 255, "Return 255");
    // await assert("return 256", 0, "Return 256 (mod 256)"); // POSIX says >255 is undefined/mod?

    // 2. Control Flow (Stopping Execution)
    // Core requirement: 'return' stops the current shell execution environment or function.
    // In our single-shell simulation, 'return' at top level might behave like 'exit' for the command string?
    // "The return utility shall cause the shell to stop executing the current function or dot script."
    // "If startd interactively... unspecified."

    // We treat "ExecuteCommand.execute('string')" as a script execution unit.
    await assert("return 0; echo FAIL", 0, "Stop sequence at 0");
    await assert("return 1; echo FAIL", 1, "Stop sequence at 1");

    // 3. Conditional Logic
    await assert("true && return 0; echo FAIL", 0, "Short circuit AND return");
    await assert("false || return 2; echo FAIL", 2, "Short circuit OR return");

    // 4. Argument Validation
    // Validates that return with no args reuses the previous exit code (which was 2 from the previous test)
    await assert("return", 2, "Return no arg (preserves last status)");
    // Test preservation:
    // "false; return" -> should be 1
    await assert("false; return", 1, "Persist previous exit code");

    // 5. Invalid Args
    // "return foo" -> >0 exit code?
    // await assert("return foo", 1, "Invalid arg non-numeric"); // Or 128? POSIX unspecified?

    // 6. Subshells
    // "(return 1); echo OK" -> return strictly exits the subshell, not the main. (Actually return is for functions/scripts)
    // "If the shell is not currently executing a function or dot script... results are unspecified."
    // We will define it as exiting the current AST execution scope. 
    // If in subshell ( ), it exits the subshell.
    // await assert("(return 5); echo OK", 0, "Return inside subshell only exits subshell");

    // 7. Loop interaction
    // "for i in 1 2; do return 1; done; echo FAIL"

    console.log(`Passed: ${passed}/${run}`);
}

runTests().catch(console.error);
