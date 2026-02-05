import { TerminalState } from '../entities/TerminalState';
import { CommandResponse } from '../entities/Command';

export interface IShellExecutor {
    execute(input: string, state: TerminalState): Promise<CommandResponse>;
}
