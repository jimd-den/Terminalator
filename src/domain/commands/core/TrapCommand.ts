/**
 * @file TrapCommand.ts
 * @description The 'trap' command. Trap signals.
 *
 * THE EIGHT PILLARS OF THE CRAFT:
 * 1. Strict Architecture: Implements ICommand.
 * 2. Literate Documentation: Explains usage.
 * 3. Dependency Minimalism: Minimal deps.
 * 4. Telemetry: Logged.
 * 5. Performance: O(1).
 * 6. Universal Readability: Clear name.
 * 7. Pragmatic Patterns: Command pattern.
 * 8. SOLID / KISS: Simple implementation.
 */

import { ICommand, CommandResponse } from '../ICommand';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../entities/TerminalState';
import { ProcessContext } from '../../../domain/entities/ProcessContext';

export class TrapCommand implements ICommand {
    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        if (args.length === 0) { // -p is implied if no args
            let output = '';
            // POSIX format: trap -- 'action' signal
            if (state.traps) {
                state.traps.forEach((action, sig) => {
                    output += `trap -- '${action.replace(/'/g, "'\\''")}' ${sig}\n`;
                });
            }
            return { output: output.trimEnd(), newState: state, exitCode: 0 };
        }

        let action = args[0];
        let signals = args.slice(1);

        // Check for options like -l or -p
        if (action === '-l') {
            return { output: 'EXIT HUP INT QUIT ILL TRAP ABRT BUS FPE KILL USR1 SEGV USR2 PIPE ALRM TERM CHLD CONT STOP TSTP TTIN TTOU URG XCPU XFSZ VTALRM PROF WINCH POLL POWER SYS', newState: state, exitCode: 0 };
        }

        if (action === '-p') {
            // List logic (same as no args)
            let output = '';
            if (state.traps) {
                state.traps.forEach((cmd, sig) => {
                    output += `trap -- '${cmd.replace(/'/g, "'\\''")}' ${sig}\n`;
                });
            }
            return { output: output.trimEnd(), newState: state, exitCode: 0 };
        }

        // Logic to determine if first arg is an action or a signal (reset)
        // POSIX: If the first operand is an unsigned decimal integer... action is reset.
        const isSignal = (s: string) => /^[0-9]+$/.test(s) || ['EXIT', 'ERR', 'DEBUG', 'RETURN'].includes(s.toUpperCase()) || /^[A-Z]+$/.test(s.toUpperCase());

        if (isSignal(action) && action !== 'EXIT' && action !== 'ERR' && action !== 'DEBUG' && action !== 'RETURN') {
            // Note: EXIT is a signal name, but also a condition. 
            // "trap signal_code [signal_code...]" -> resets
            // BUT "trap action signal_code"
            // How to distinguish `trap EXIT` (reset) from `trap cmd EXIT`?
            // Since `cmd` can be anything...
            // Heuristic: If arg[0] is a number or standard signal name AND args length > 0...
            // Wait, `trap 0` is valid. `trap EXIT` is valid.
            // Usually, if the FIRST arg is a signal, it means RESET.
            // If the first arg is *not* a signal, it is the ACTION.
            // Is `ls` a signal? No. `trap ls EXIT` -> run ls on exit.
            // Is `EXIT` a signal? Yes. `trap EXIT` -> Reset exit trap? No, `trap - EXIT` or `trap signal`.
            // POSIX: "If the first operand is... a signal name... the trap shall be set to defaults"
            // So `trap EXIT` resets EXIT.
        }

        // Simplified Logic:
        let reset = false;
        let startIndex = 1; // Start assume action + signals

        if (isSignal(action) && signals.length === 0) {
            // Single arg which is a signal -> reset input
            reset = true;
            signals = [action];
            startIndex = 1; // signals consumed
        } else if (isSignal(action)) {
            // Multiple args: `trap HUP INT` -> reset both
            // `trap ls INT` -> ls is NOT a signal.
            // So if first is signal, assume all are signals and reset mode.
            reset = true;
            signals = args;
            startIndex = args.length;
        } else if (action === '-') {
            reset = true;
        }

        if (reset) {
            signals.forEach(sig => {
                let s = sig.toUpperCase();
                if (s === '0') s = 'EXIT';
                state.traps.delete(s);
            });
            return { output: '', newState: state, exitCode: 0 };
        }

        // Set action
        for (const sig of signals) {
            let s = sig.toUpperCase();
            if (s === '0') s = 'EXIT';
            state.traps.set(s, action);
        }

        return {
            output: '',
            newState: state,
            exitCode: 0
        };
    }
}
