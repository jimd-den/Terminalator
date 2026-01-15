import { ICommand, CommandResponse } from '../../../domain/entities/Command';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../../domain/entities/TerminalState';
import { MailSystem } from '../../../domain/usecases/MailSystem';

export class MailCommand implements ICommand {
    name = 'mail';
    description = 'Read and manage system messages';

    constructor(private mailSystem: MailSystem) { }

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        // Simple list for now, could handle arguments later
        return {
            output: this.mailSystem.listMail(),
            exitCode: 0,
            newState: state
        };
    }
}
