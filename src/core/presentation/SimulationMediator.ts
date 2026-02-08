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

        // 1. Lock Input (Signal Start)
        // We use a custom event or reuse PRESENTATION_START context
        // But the plan says: "Emit THEATRE_ACTIVE"
        // Let's assume THEATRE_ACTIVE is mapped to PRESENTATION_START in the listener for now,
        // or we define a new event. The Spec said "Broadcast THEATRE_ACTIVE".
        // However, useTheatricalInputLock currently listens to PRESENTATION_START.
        // I will stick to PRESENTATION_START for compatibility or update the hook later.
        // For now, let's trigger the Director, which emits PRESENTATION_START.
        
        const parts = input.trim().split(/\s+/);
        const verb = parts[0];
        const args = parts.slice(1);

        // 2. Trigger Presentation
        // The Director will emit PRESENTATION_START (locking input)
        // AND we await the ANIMATION_COMPLETE event.
        
        // We need to ensure the Director doesn't just fire-and-forget if we want to await here.
        // But the plan says "Call PresentationDirector.present()" then "Await ANIMATION_COMPLETE".
        // The Director currently emits PRESENTATION_END after a timeout.
        // We will refactor that in Phase 2.
        // For now, we follow the sequence.

        // Trigger presentation
        await this.director.presentCommand(verb, args);

        // 3. Wait for Animation (Phase 2 refactor will enforce this via event)
        // For now, presentCommand includes the delay. 
        // In Phase 2, we will change presentCommand to NOT delay, and wait for event.
        
        // 4. Execute Domain Command
        const response = await this.executor.execute(input, state);

        // 5. Unlock Input (Signal End)
        // Director emits PRESENTATION_END.
        
        return response;
    }
}
