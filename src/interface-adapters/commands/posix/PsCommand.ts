
import { ICommand, CommandResponse } from '../../../domain/entities/Command';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../../domain/entities/TerminalState';
import { ProcessManager } from '../../../domain/usecases/ProcessManager';

export class PsCommand implements ICommand {
    name = 'ps';
    description = 'Report a snapshot of the current processes';

    constructor(private processManager: ProcessManager) { }

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        const input = context.stdin;
        const processes = this.processManager.list();

        // Header
        const lines = ['  PID TTY          TIME CMD'];

        for (const proc of processes) {
            // Format: PID (5) TTY (8) TIME (8) CMD
            const pid = proc.pid.toString().padStart(5);
            const tty = (proc.tty || '?').padEnd(8);

            // Time calculation (simplified)
            const now = new Date();
            const diff = now.getTime() - proc.startTime.getTime();
            const seconds = Math.floor(diff / 1000);
            const timeStr = new Date(seconds * 1000).toISOString().substr(11, 8); // HH:mm:ss

            lines.push(`${pid} ${tty} ${timeStr} ${proc.command}`);
        }

        return {
            output: lines.join('\n'),
            exitCode: 0
        };
    }
}

export class KillCommand implements ICommand {
    name = 'kill';
    description = 'Send a signal to a process';

    constructor(private processManager: ProcessManager) { }

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        const input = context.stdin;
        if (args.length === 0) {
            return { output: 'kill: usage: kill [-s signal_name] pid ...', exitCode: 1 };
        }

        const pidStr = args[args.length - 1];
        const pid = parseInt(pidStr, 10);

        if (isNaN(pid)) {
            return { output: `kill: ${pidStr}: arguments must be process or job IDs`, exitCode: 1 };
        }

        // Try to kill via manager
        // Manager's kill returns boolean
        if (pid === 1) {
            return { output: `kill: (${pid}) - Operation not permitted`, exitCode: 1 };
        }

        const success = this.processManager.kill(pid);

        if (success) {
            // Success. Typically silent, but "Terminated" is friendly.
            // POSIX is silent unless verbose or interactive usually.
            // But for this game, feedback is nice.
            // "Terminated" implies the process was running and stopped.
            return { output: 'Terminated', exitCode: 0 };
        } else {
            return { output: `kill: (${pid}) - No such process`, exitCode: 1 };
        }
    }
}
