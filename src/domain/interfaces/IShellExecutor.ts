import { TerminalState } from '../entities/TerminalState';
import { CommandResponse } from '../entities/Command';
import { CommandRegistry } from '../commands/CommandRegistry';

export interface IShellExecutor {
    execute(input: string, state: TerminalState): Promise<CommandResponse>;
    getRegistry(): CommandRegistry;
}
