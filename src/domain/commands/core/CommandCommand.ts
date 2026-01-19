/**
 * @file CommandCommand.ts
 * @description The 'command' command. Execute a simple command.
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
import { TerminalState } from '../../entities/TerminalState';

export class CommandCommand implements ICommand {
    constructor(private registryProvider: (name: string) => ICommand | undefined) {}

    async execute(args: string[], state: TerminalState, input?: string): Promise<CommandResponse> {
        if (args.length === 0) return { output: '', newState: state, exitCode: 0 };

        let cmdName = args[0];
        let cmdArgs = args.slice(1);

        if (cmdName === '-v' || cmdName === '-V') {
             if (cmdArgs.length > 0) {
                 const name = cmdArgs[0];
                 const cmd = this.registryProvider(name);
                 if (cmd) {
                     return { output: name, newState: state, exitCode: 0 };
                 } else {
                     return { output: '', newState: state, exitCode: 1 };
                 }
             }
             return { output: '', newState: state, exitCode: 0 };
        }

        const cmd = this.registryProvider(cmdName);
        if (!cmd) {
             return { output: `command: ${cmdName}: not found`, newState: state, exitCode: 127 };
        }

        return cmd.execute(cmdArgs, state, input);
    }
}
