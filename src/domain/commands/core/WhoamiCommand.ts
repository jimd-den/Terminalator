import { getStdinAsString } from '../../entities/ProcessContext';
import { ICommand, CommandResponse } from '../ICommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../entities/TerminalState';

export class WhoamiCommand implements ICommand {
    name = 'whoami';
    description = 'Print the user name associated with the current effective user ID';

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse | Promise<CommandResponse> {
        return {
            output: state.environment['USER'] || 'operator',
            newState: state,
            exitCode: 0
        };
    }
}
