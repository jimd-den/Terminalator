import { ICommand, CommandResponse } from '../../entities/Command';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';

/**
 * GuiCommand - Domain Layer (Special)
 * 
 * Narrative: A mockup of a slow, bloated web GUI.
 * Purpose: To physically frustrate the player and highlight 
 * terminal efficiency.
 * 
 * Pillar: The Master's Tool (Narrative Design)
 * Pillar: The Balanced Scale (KISS)
 */
export class GuiCommand implements ICommand {
    public readonly name = 'gui';
    public readonly description = 'Attempt to launch the visual administration dashboard.';

    public async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        let output = "INITIALIZING BOOTSTRAP SEQUENCE...\n";
        output += "[ 0% ] LOADING ASSETS (12.4MB)...\n";

        // Simulating the "Wait" feel via text if we can't do actual sleeps in the standard execute
        // But since this is async, we CAN do sleeps!

        await new Promise(resolve => setTimeout(resolve, 1500));
        output += "[ 35% ] FETCHING JS BUNDLE (45MB)...\n";

        await new Promise(resolve => setTimeout(resolve, 2000));
        output += "[ 78% ] PARSING DOM TREE...\n";

        await new Promise(resolve => setTimeout(resolve, 1500));
        output += "ERROR: [TIMEOUT_0xCCFF] SOCKET_HANG_UP\n";
        output += "CRITICAL: RENDER ENGINE FAILED. FALLBACK TO CONSOLE RECOMMENDED.\n";

        return {
            output,
            exitCode: 1
        };
    }
}
