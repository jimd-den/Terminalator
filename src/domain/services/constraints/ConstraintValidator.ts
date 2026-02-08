/**
 * ConstraintValidator.ts - Domain Service
 * 
 * Validates if a mission's constraints are met.
 * 
 * Pillar: The Balanced Scale (SRP)
 */

import { Mission } from '../../entities/Mission';
import { ExecutionStats, ComplexityEstimator } from './ComplexityEstimator';

export class ConstraintValidator {
    constructor(private complexityEstimator: ComplexityEstimator) {}

    /**
     * Validates execution stats against mission constraints.
     */
    public validate(mission: Mission, stats: ExecutionStats): { valid: boolean; reason?: string } {
        if (!mission.constraints) return { valid: true };

        const { constraints } = mission;

        // 1. Time Constraint
        if (constraints.maxTimeMs && stats.timeMs > constraints.maxTimeMs) {
            return { valid: false, reason: `TIMEOUT: Execution took ${stats.timeMs}ms, limit ${constraints.maxTimeMs}ms.` };
        }

        // 2. Memory Constraint
        if (constraints.maxMemoryBytes && stats.memoryUsed > constraints.maxMemoryBytes) {
            return { valid: false, reason: `OOM: Memory usage ${stats.memoryUsed} bytes, limit ${constraints.maxMemoryBytes} bytes.` };
        }

        // 3. Complexity Constraint
        if (constraints.requiredComplexity && mission.problemSize) {
            const efficient = this.complexityEstimator.isEfficient(
                mission.problemSize,
                stats,
                constraints.requiredComplexity
            );
            
            if (!efficient) {
                return { 
                    valid: false, 
                    reason: `INEFFICIENT: Algorithm does not meet ${constraints.requiredComplexity} requirement for n=${mission.problemSize}.` 
                };
            }
        }

        return { valid: true };
    }
}
