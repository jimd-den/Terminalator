import type { TerminalState } from '../entities/TerminalState';
import type { CommandResponse } from '../entities/Command';
import { CommandRegistry } from '../commands/CommandRegistry';

export interface IShellExecutor {
    execute(input: string, state: TerminalState): Promise<CommandResponse>;
    getRegistry(): CommandRegistry;
}
