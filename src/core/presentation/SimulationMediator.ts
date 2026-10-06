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
        const cmdName = parts[0];
        const args = parts.slice(1);

        // Fetch Metadata from Command Registry if possible
        let verb = cmdName.toUpperCase();
        const registry = (this.executor as any).getRegistry?.();
        if (registry) {
            const cmd = registry.get(cmdName);
            if (cmd && cmd.getMetadata) {
                const meta = cmd.getMetadata();
                verb = meta.verb || verb;
            }
        }

        console.log(`[SimulationMediator] Orchestrating execution for: ${cmdName} using verb: ${verb}`);

        // 1. Lock Input
        this.bus.emit(GameEventType.TUTOR_EVENT, { type: 'THEATRE_ACTIVE' as any, payload: { command: cmdName } });

        // 2. Pre-Execution Animation
        const preAnimPromise = this.waitForEvent('ANIMATION_COMPLETE');
        this.bus.emit(GameEventType.TUTOR_EVENT, { 
            type: 'PRESENTATION_START' as any, 
            payload: { 
                verb: verb.toUpperCase(), 
                command: input, 
                args, 
                stage: 'PRE' 
            } 
        });
        await preAnimPromise;

        // 3. Domain Execution
        const response = await this.executor.execute(input, state);

        // 4. Push Result Card data to UI (So it has it during POST-animation)
        this.bus.emit(GameEventType.TUTOR_EVENT, { 
            type: 'RESULT_CARD' as any, 
            payload: { 
                id: Math.random().toString(36).substring(2, 9),
                command: input,
                output: response.output,
                exitCode: response.exitCode,
                metadata: response.metadata, // Pass metadata (e.g., renderType) to the UI
                timestamp: Date.now(),
                hostname: response.newState?.fsContext || state.fsContext || 'LOCAL'
            } 
        });

        // 5. Post-Execution Animation (Result)
        const postAnimPromise = this.waitForEvent('ANIMATION_COMPLETE');
        this.bus.emit(GameEventType.TUTOR_EVENT, { 
            type: 'PRESENTATION_RESULT' as any, 
            payload: { 
                verb, 
                command: verb, 
                exitCode: response.exitCode,
                stage: 'POST' 
            } 
        });
        await postAnimPromise;

        // 6. Unlock Input
        this.bus.emit(GameEventType.TUTOR_EVENT, { type: 'THEATRE_COMPLETE' as any, payload: { command: cmdName } });
        
        return response;
    }

    /**
     * Internal helper to await specific tutor event types.
     */
    private waitForEvent(targetType: string): Promise<void> {
        return new Promise((resolve) => {
            const unsub = this.bus.subscribe(GameEventType.TUTOR_EVENT, (event) => {
                if (event.payload.type === targetType) {
                    unsub();
                    resolve();
                }
            });
            // Safety timeout
            setTimeout(() => {
                unsub();
                resolve();
            }, 5000);
        });
    }
}
