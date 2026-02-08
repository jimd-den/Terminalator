/**
 * JobTemplate.ts - Domain Entity
 * 
 * Defines the requirements and constraints for a mission task.
 * 
 * Pillar: The Four-Fold Shield (Enterprise Logic)
 */

export interface JobConstraints {
    maxTimeMs?: number;
    maxMemoryBytes?: number;
    maxIterations?: number;
    requiredComplexity?: 'O(1)' | 'O(log n)' | 'O(n)';
    maxBandwidthUsage?: number;
}

export interface JobTemplate {
    id: string;
    objective: string;
    
    /**
     * The input size (n) for the problem.
     */
    problemSize: number;
    
    constraints: JobConstraints;
    
    reward: string;
}
