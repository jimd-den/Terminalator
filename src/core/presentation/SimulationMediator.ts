import { SimulationBus, GameEventType } from '../../domain/services/SimulationBus';
import { PresentationDirector } from '../../domain/services/PresentationDirector';
import { IShellExecutor } from '../../domain/interfaces/IShellExecutor';
import { CommandResponse } from '../../domain/entities/Command';
import { TerminalState } from '../../domain/entities/TerminalState';

/**
 * SimulationMediator - Core Layer
 * 
 * The Central Nervous System of the "Glass Box" simulation.
 * Coordinates the interaction between:
 * 1. Theatrical Presentation (Animation)
 * 2. Input Gating (Locking)
 * 3. Domain Logic (Execution)
 * 
 * Pillar: THE MEDIATOR (Behavioral Pattern)
 */
export class SimulationMediator {
    constructor(
        private bus: SimulationBus,
        private director: PresentationDirector,
        private executor: IShellExecutor
    ) {}

    /**
     * Orchestrates the execution of a command with full theatrical effects.
     */
    public async executeWithTheatre(input: string, state: TerminalState): Promise<CommandResponse> {
        if (!input.trim()) {
            return { output: '', exitCode: 0, newState: state, command: input };
        }

        const parts = input.trim().split(/\s+/);
        const verb = parts[0];
        const args = parts.slice(1);

        // 1. Signal Theatre Start (Lock Input)
        this.bus.emit(GameEventType.TUTOR_EVENT, { type: 'THEATRE_ACTIVE' as any, payload: { command: verb } });

        // 2. Trigger Presentation
        // Director emits PRESENTATION_START for UI components
        await this.director.presentCommand(verb, args);

        // 3. Await Animation Completion from UI
        console.log("[SimulationMediator] Waiting for ANIMATION_COMPLETE...");
        try {
            // await this.bus.waitFor(GameEventType.TUTOR_EVENT, 5000); 
            await new Promise<void>((resolve) => {
                const unsub = this.bus.subscribe(GameEventType.TUTOR_EVENT, (event) => {
                    if (event.payload.type === 'ANIMATION_COMPLETE') {
                        console.log("[SimulationMediator] Received ANIMATION_COMPLETE. Proceeding.");
                        unsub();
                        resolve();
                    }
                });
            });
        } catch (e) {
            console.warn("[SimulationMediator] Animation wait timeout or error. Proceeding with execution.");
        }

        // 4. Execute Domain Command
        const response = await this.executor.execute(input, state);

        // 5. Signal Theatre End (Unlock Input)
        this.bus.emit(GameEventType.TUTOR_EVENT, { type: 'THEATRE_COMPLETE' as any, payload: { command: verb } });
        
        return response;
    }
}
