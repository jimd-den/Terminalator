import { ICreditService } from './ICreditService';
import { CreditSystem } from '../../entities/gamification/CreditSystem';

export class CreditService implements ICreditService {
    // In a real app, this would persist to disk/db
    // For now, we keep it in memory
    private system = new CreditSystem();

    async getBalance(): Promise<number> {
        return this.system.balance;
    }

    async awardCredits(amount: number, reason: string): Promise<void> {
        this.system.add(amount);
    }

    async spendCredits(amount: number, reason: string): Promise<boolean> {
        if (this.system.balance >= amount) {
            this.system.subtract(amount);
            return true;
        }
        return false;
    }
}
