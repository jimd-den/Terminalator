export interface ICreditService {
    getBalance(): Promise<number>;
    awardCredits(amount: number, reason: string): Promise<void>;
    spendCredits(amount: number, reason: string): Promise<boolean>;
}
