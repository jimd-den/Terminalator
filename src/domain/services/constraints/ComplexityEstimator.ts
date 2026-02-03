/**
 * ComplexityEstimator.ts - Domain Service
 * 
 * Estimates the computational complexity of a user's solution.
 * Used to enforce Knuthian constraints (O(n) vs O(log n)).
 * 
 * Pillar: The Balanced Scale (KISS)
 */

export interface ExecutionStats {
    iterations: number;
    memoryUsed: number;
    timeMs: number;
}

export class ComplexityEstimator {
    /**
     * Determines if a solution is efficient enough for the given input size.
     * 
     * @param inputSize - Size of the problem (n).
     * @param stats - Measured execution stats.
     * @param complexityLimit - 'O(n)', 'O(log n)', 'O(1)'.
     */
    public isEfficient(inputSize: number, stats: ExecutionStats, complexityLimit: 'O(1)' | 'O(log n)' | 'O(n)'): boolean {
        switch (complexityLimit) {
            case 'O(1)':
                return stats.iterations < 10; // Constant threshold
            
            case 'O(log n)':
                const logLimit = Math.log2(inputSize) * 2; // Allowing some overhead
                return stats.iterations <= Math.max(5, logLimit);
                
            case 'O(n)':
                return stats.iterations <= inputSize * 1.5;
                
            default:
                return true;
        }
    }
}
