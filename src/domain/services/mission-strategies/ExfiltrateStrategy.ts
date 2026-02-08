import { ComposableMissionStrategy } from './ComposableMissionStrategy';
import { ExfiltrateInspector } from './exfiltrate/ExfiltrateInspector';
import { ExfiltrateNarrative } from './exfiltrate/ExfiltrateNarrative';
import { ExfiltrateProgression } from './exfiltrate/ExfiltrateProgression';

/**
 * ExfiltrateStrategy - Domain Service
 * 
 * Re-implemented using ComposableMissionStrategy to adhere to SRP.
 * 
 * Pillar: SRP / Composition over Inheritance
 */
export class ExfiltrateStrategy extends ComposableMissionStrategy {
    constructor() {
        super(
            ExfiltrateInspector,
            ExfiltrateNarrative,
            ExfiltrateProgression
        );
    }
}