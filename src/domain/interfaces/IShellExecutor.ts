import { TerminalState } from '../entities/TerminalState';
import { CommandResponse } from '../usecases/ExecuteCommand';

export interface IShellExecutor {
    execute(input: string, state: TerminalState): Promise<CommandResponse>;
}
