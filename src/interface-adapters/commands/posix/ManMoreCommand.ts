
import { ICommand, CommandResponse } from '../../../domain/entities/Command';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../../domain/entities/TerminalState';
import { HelpCommand } from './HelpCommand';
import { CatCommand } from './CatCommand';

export class ManCommand implements ICommand {
    name = 'man';
    description = 'Format and display the on-line manual pages';

    constructor(private helpCmd: HelpCommand) { }

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        // Delegate to help
        if (args.length === 0) {
            return { output: 'What manual page do you want?', exitCode: 1 };
        }
        return this.helpCmd.execute(args, context, state);
    }
}

export class MoreCommand implements ICommand {
    name = 'more';
    description = 'File perusal filter for crt viewing';

    constructor(private catCmd: CatCommand) { }

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        // Delegate to cat (UI handles scrolling)
        return this.catCmd.execute(args, context, state);
    }
}
