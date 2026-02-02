import { ICommand, CommandResponse } from '../../entities/Command';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';

/**
 * DispatchCommand - Domain Layer (Special)
 * 
 * Narrative: Manually route units to incidents.
 * 
 * Pillar: The Master's Tool (Narrative Design)
 * Pillar: The Balanced Scale (KISS)
 */
export class DispatchCommand implements ICommand {
    public readonly name = 'dispatch';
    public readonly description = 'Dispatch a unit to an incident. Usage: dispatch <unit-id> <incident-id>';

    public async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        if (args.length < 2) {
            return {
                output: "ERROR: MISSING ARGUMENTS. USAGE: dispatch <unit-id> <incident-id>",
                exitCode: 1
            };
        }

        const unitId = args[0];
        const incidentId = args[1];

        // Narrative success
        const output = `[ SYSTEM DISPATCH ]\nUNIT: ${unitId}\nINCIDENT: ${incidentId}\nROUTE: CALCULATED\nSTATUS: EN ROUTE (ETA 4 MINS).\n`;

        return {
            output,
            exitCode: 0
        };
    }
}
