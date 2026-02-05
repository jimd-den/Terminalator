/**
 * IMasteryRepository.ts
 * 
 * Port for persisting skill mastery levels.
 */

export interface MasteryData {
    successCounts: Record<string, number>;
    failureCounts: Record<string, number>;
}

export interface IMasteryRepository {
    getMasteryData(): Promise<MasteryData>;
    saveMasteryData(data: MasteryData): Promise<void>;
}
