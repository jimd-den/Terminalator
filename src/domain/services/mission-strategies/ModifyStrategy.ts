import { ComposableMissionStrategy } from './ComposableMissionStrategy';
import { ModifyInspector } from './modify/ModifyInspector';
import { ModifyNarrative } from './modify/ModifyNarrative';
import { ModifyProgression } from './modify/ModifyProgression';

/**
 * ModifyStrategy - Domain Service
 * 
 * Re-implemented using ComposableMissionStrategy to adhere to SRP.
 * 
 * Pillar: SRP / Composition over Inheritance
 */
export class ModifyStrategy extends ComposableMissionStrategy {
    constructor() {
        super(
            ModifyInspector,
            ModifyNarrative,
            ModifyProgression
        );
    }
}