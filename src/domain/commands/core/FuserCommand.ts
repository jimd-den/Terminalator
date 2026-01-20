/**
 * @file FuserCommand.ts
 * @description The 'fuser' command. Identify processes using files or sockets.
 */
import { ICommand, CommandResponse } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';
import { FileSystem } from '../../entities/FileSystem';

export class FuserCommand implements ICommand {
    constructor(private fs: FileSystem) { }

    async execute(args: string[], state: TerminalState, _input?: string): Promise<CommandResponse> {
        const files: string[] = [];
        let kill = false;
        let silent = false;
        let user = false;

        // 1. Argument Parsing
        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            if (arg === '-k') {
                kill = true;
            } else if (arg === '-u') {
                user = true;
            } else if (arg === '-c') {
                // Mount point mode, treat as normal file for mock
            } else if (arg === '-s') {
                // Heuristic: If next arg is a number, it's a signal (Linux extension style test case)
                // If not, it's "silent".
                if (i + 1 < args.length && /^\d+$/.test(args[i + 1])) {
                    // Signal specified, e.g. -s 9
                    i++;
                    // We don't actually use the signal in this mock, but we consume the arg.
                } else {
                    silent = true;
                }
            } else if (!arg.startsWith('-')) {
                files.push(arg);
            }
        }

        if (files.length === 0) {
            return { output: 'fuser: missing operand', newState: state, exitCode: 1 };
        }

        let output = '';
        const mockPid = '1234';

        // 2. Process Files
        for (const file of files) {
            const dentry = this.fs.resolve(file, state.currentDirectory);
            if (!dentry) return { output: `fuser: ${file}: No such file or directory`, newState: state, exitCode: 1 };

            if (!silent) {
                if (user) {
                    output += `${file}:  ${mockPid}(operator)\n`;
                } else {
                    output += `${file}:  ${mockPid}\n`;
                }
            }
        }

        return { output: silent ? '' : output, newState: state, exitCode: 0 };
    }
}
