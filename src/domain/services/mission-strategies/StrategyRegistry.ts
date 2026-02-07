/**
 * StrategyRegistry.ts - Domain Service
 * 
 * Central registry for Mission Strategies.
 * Enables OCP by allowing new mission types to be added without modifying the consumer (TutorService).
 * 
 * Pillar: Open/Closed Principle (SOLID)
 */

import { IMissionStrategy } from './IMissionStrategy';
import { ExfiltrateStrategy } from './ExfiltrateStrategy';
import { ModifyStrategy } from './ModifyStrategy';
import { LogAnalysisStrategy } from './LogAnalysisStrategy';
import { DispatcherStrategy } from './DispatcherStrategy';
import { GenericMissionStrategy } from './GenericMissionStrategy';

export class StrategyRegistry {
    private strategies = new Map<string, IMissionStrategy>();

    constructor() {
        this.initializeDefaults();
    }

    private initializeDefaults() {
        this.register('exfiltrate', new ExfiltrateStrategy());
        this.register('modify', new ModifyStrategy());
        this.register('log-analysis', new LogAnalysisStrategy());
        this.register('dispatcher', new DispatcherStrategy());
        this.register('generative', new GenericMissionStrategy());
    }

    /**
     * Registers a strategy for a specific mission type.
     */
    public register(type: string, strategy: IMissionStrategy): void {
        this.strategies.set(type, strategy);
    }

    /**
     * Retrieves the strategy for a mission type.
     * Falls back to 'exfiltrate' if not found.
     */
    public get(type: string): IMissionStrategy {
        return this.strategies.get(type) || this.strategies.get('exfiltrate')!;
    }
}
