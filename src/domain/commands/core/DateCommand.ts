import { ICommand, CommandResponse } from '../ICommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../entities/TerminalState';

export class DateCommand implements ICommand {
    name = 'date';
    description = 'Display the current time';

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse | Promise<CommandResponse> {
        return {
            output: new Date().toString(),
            exitCode: 0,
            newState: state
        };
    }
}
