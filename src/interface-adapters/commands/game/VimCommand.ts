import { ICommand, CommandResponse } from '../../../domain/entities/Command';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../../domain/entities/TerminalState';

export class VimCommand implements ICommand {
    name = 'vim';
    description = 'Vi IMproved, a programmer\'s text editor';

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        const filename = args[0] || 'scratchpad.24xx';
        return {
            output: `Opening ${filename} in editor...`,
            exitCode: 0,
            newState: state,
            navigationAction: {
                type: 'NAVIGATE',
                target: 'Editor',
                params: { filename }
            }
        };
    }
}
