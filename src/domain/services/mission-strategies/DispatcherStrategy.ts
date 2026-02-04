import { ComposableMissionStrategy } from './ComposableMissionStrategy';
import { DispatcherInspector } from './dispatcher/DispatcherInspector';
import { DispatcherNarrative } from './dispatcher/DispatcherNarrative';
import { DispatcherProgression } from './dispatcher/DispatcherProgression';

/**
 * DispatcherStrategy - Domain Service
 * 
 * Re-implemented using ComposableMissionStrategy to adhere to SRP.
 * 
 * Pillar: SRP / Composition over Inheritance
 */
export class DispatcherStrategy extends ComposableMissionStrategy {
    constructor() {
        super(
            DispatcherInspector,
            DispatcherNarrative,
            DispatcherProgression
        );
    }
}