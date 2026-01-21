
import { ICommand, CommandResponse } from '../../../domain/entities/Command';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../../domain/entities/TerminalState';

/**
 * HelpCommand
 * 
 * Auto-discovers and lists available commands from the provided registry list.
 */
export class HelpCommand implements ICommand {
    name = 'help';
    description = 'Display information about builtin commands.';

    constructor(private commands: ICommand[]) { }

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        const input = context.stdin;
        // If specific command requested: help <cmd>
        if (args.length > 0) {
            const cmdName = args[0];
            const cmd = this.commands.find(c => c.name === cmdName);
            if (cmd) {
                return {
                    output: `${cmd.name} - ${cmd.description}\n`,
                    exitCode: 0
                };
            } else {
                return {
                    output: `help: no help topics match '${cmdName}'. Try 'help' to see command list.`,
                    exitCode: 1
                };
            }
        }

        // List all
        // Sort alphabetically
        const sorted = [...this.commands].sort((a, b) => a.name.localeCompare(b.name));

        const lines: string[] = [];
        lines.push('GNU bash, version 5.0.17(1)-release (x86_64-pc-linux-gnu)');
        lines.push('These shell commands are defined internally.  Type `help` to see this list.');
        lines.push('Type `help name` to find out more about the function `name`.');
        lines.push('');

        // Calculate padding
        const maxLength = Math.max(...sorted.map(c => c.name.length));
        const pad = maxLength + 2;

        for (const cmd of sorted) {
            lines.push(` ${cmd.name.padEnd(pad)} ${cmd.description}`);
        }

        return {
            output: lines.join('\n'),
            exitCode: 0
        };
    }
}
