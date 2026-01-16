
import { ICommand, CommandResponse } from '../../../domain/entities/Command';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../../domain/entities/TerminalState';

export class PsCommand implements ICommand {
    name = 'ps';
    description = 'Report a snapshot of the current processes';

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        // Mock output
        // PID TTY          TIME CMD
        // 1   ?        00:00:01 init
        // 100 pts/0    00:00:00 sh
        // 101 pts/0    00:00:00 ps (self)

        const lines = [
            '  PID TTY          TIME CMD',
            '    1 ?        00:00:01 init',
            '  100 pts/0    00:00:00 sh',
            '  101 pts/0    00:00:00 ps'
        ];

        return {
            output: lines.join('\n'),
            exitCode: 0
        };
    }
}

export class KillCommand implements ICommand {
    name = 'kill';
    description = 'Send a signal to a process';

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        if (args.length === 0) {
            return { output: 'kill: usage: kill [-s signal_name] pid ...', exitCode: 1 };
        }

        // Just check if PID is valid in our mock world
        // PIDs: 1, 100, 101
        // If we kill 100 (sh), we might want to say "Terminated" but not actually kill the shell (that would be bad UX here)
        // If we kill 1 (init), "Operation not permitted"

        const pid = args[args.length - 1]; // Last arg is usually PID
        // Basic check
        if (pid === '1') {
            return { output: 'kill: (1) - Operation not permitted', exitCode: 1 };
        }
        if (pid === '100') {
            // Mock kill sh
            return { output: 'Terminated', exitCode: 0 };
        }
        if (pid === '101') {
            // Mock kill self?
            return { output: '', exitCode: 0 };
        }

        // Random PID -> Not found
        // Allow killing arbitrary numbers just to say "No such process"
        if (!/^\d+$/.test(pid)) {
            return { output: `kill: ${pid}: arguments must be process or job IDs`, exitCode: 1 };
        }

        return { output: `kill: (${pid}) - No such process`, exitCode: 1 };
    }
}
