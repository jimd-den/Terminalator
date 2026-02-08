import { ICreditService } from './ICreditService';
import { CreditSystem } from '../../entities/gamification/CreditSystem';
import { ICreditRepository } from '../../interfaces/ICreditRepository';

export class CreditService implements ICreditService {
    private system = new CreditSystem();
    private repository?: ICreditRepository;
    private initialized: Promise<void>;

    constructor(repository?: ICreditRepository) {
        this.repository = repository;
        this.initialized = this.load();
    }

    private async load() {
        if (this.repository) {
            const balance = await this.repository.getCredits();
            this.system = new CreditSystem();
            this.system.add(balance);
        }
    }

    async getBalance(): Promise<number> {
        await this.initialized;
        return this.system.balance;
    }

    async awardCredits(amount: number, reason: string): Promise<void> {
        await this.initialized;
        this.system.add(amount);
        await this.save();
    }

    async spendCredits(amount: number, reason: string): Promise<boolean> {
        await this.initialized;
        if (this.system.balance >= amount) {
            this.system.subtract(amount);
            await this.save();
            return true;
        }
        return false;
    }

    private async save() {
        if (this.repository) {
            await this.repository.saveCredits(this.system.balance);
        }
    }
}
