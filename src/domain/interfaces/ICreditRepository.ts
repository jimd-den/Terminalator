/**
 * ICreditRepository.ts
 * 
 * Port for persisting player credits.
 */
export interface ICreditRepository {
    getCredits(): Promise<number>;
    saveCredits(amount: number): Promise<void>;
}
