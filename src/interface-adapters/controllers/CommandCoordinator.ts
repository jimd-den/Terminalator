import { IShellExecutor } from '../../domain/interfaces/IShellExecutor';
import { PresentationDirector } from '../../domain/services/PresentationDirector';
import { TerminalState } from '../../domain/entities/TerminalState';
import { CommandResponse } from '../../domain/entities/Command';

/**
 * CommandCoordinator - Interface Adapter Layer
 * 
 * Orchestrates the flow between UI input, theatrical presentation,
 * and domain command execution.
 * 
 * Pillar: THE FOUR-FOLD SHIELD (Decoupling)
 * Pillar: THE STORYTELLER'S CODE (Orchestration)
 */
export class CommandCoordinator {
    constructor(
        private domainExecutor: IShellExecutor,
        private presentationDirector: PresentationDirector
    ) {}

    /**
     * Executes a command by first triggering theatrical effects, 
     * then running the domain logic.
     */
    public async execute(input: string, state: TerminalState): Promise<CommandResponse> {
        if (!input.trim()) {
            return { output: '', exitCode: 0, newState: state, command: input };
        }

        // 1. Theatrical Trigger
        // We parse the verb for the director
        const parts = input.trim().split(/\s+/);
        const verb = parts[0];
        const args = parts.slice(1);

        // This emits PRESENTATION_START and handles the artificial delay
        await this.presentationDirector.presentCommand(verb, args);

        // 2. Domain Execution
        const response = await this.domainExecutor.execute(input, state);

        return response;
    }
}
