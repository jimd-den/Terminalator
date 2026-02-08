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

        console.log(`[SimulationMediator] Orchestrating execution for: ${verb}`);

        // 1. Prepare for Animation Completion (Subscribe BEFORE triggering)
        const animationPromise = new Promise<void>((resolve) => {
            const unsub = this.bus.subscribe(GameEventType.TUTOR_EVENT, (event) => {
                if (event.payload.type === 'ANIMATION_COMPLETE') {
                    console.log("[SimulationMediator] Received ANIMATION_COMPLETE. Proceeding.");
                    unsub();
                    resolve();
                }
            });
            // Safety timeout to prevent permanent hang
            setTimeout(() => {
                console.warn("[SimulationMediator] Animation timed out. Forcing continuation.");
                unsub();
                resolve();
            }, 2000);
        });

        // 2. Signal Theatre Start (Lock Input)
        console.log("[SimulationMediator] Emitting THEATRE_ACTIVE.");
        this.bus.emit(GameEventType.TUTOR_EVENT, { type: 'THEATRE_ACTIVE' as any, payload: { command: verb } });

        // 3. Trigger Presentation
        console.log("[SimulationMediator] Triggering PresentationDirector.");
        await this.director.presentCommand(verb, args);

        // 4. Await Animation Completion from UI
        console.log("[SimulationMediator] Awaiting animation completion...");
        await animationPromise;

        // 5. Execute Domain Command
        console.log("[SimulationMediator] Executing domain command.");
        const response = await this.executor.execute(input, state);

        // 6. Signal Theatre End (Unlock Input)
        console.log("[SimulationMediator] Emitting THEATRE_COMPLETE.");
        this.bus.emit(GameEventType.TUTOR_EVENT, { type: 'THEATRE_COMPLETE' as any, payload: { command: verb } });
        
        return response;
    }
}
