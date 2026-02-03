import { ComposableMissionStrategy } from './ComposableMissionStrategy';
import { LogAnalysisInspector } from './log-analysis/LogAnalysisInspector';
import { LogAnalysisNarrative } from './log-analysis/LogAnalysisNarrative';
import { LogAnalysisProgression } from './log-analysis/LogAnalysisProgression';

/**
 * LogAnalysisStrategy - Domain Layer
 * 
 * Re-implemented using ComposableMissionStrategy to adhere to SRP.
 * 
 * Pillar: SRP / Composition over Inheritance
 */
export class LogAnalysisStrategy extends ComposableMissionStrategy {
    constructor() {
        super(
            LogAnalysisInspector,
            LogAnalysisNarrative,
            LogAnalysisProgression
        );
    }
}