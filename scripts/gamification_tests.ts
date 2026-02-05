import { CreditSystem } from '../src/domain/entities/gamification/CreditSystem';
import { ICreditService } from '../src/domain/services/gamification/ICreditService';

class MockCreditService implements ICreditService {
    private system = new CreditSystem();

    async getBalance(): Promise<number> {
        return this.system.balance;
    }

    async awardCredits(amount: number, reason: string): Promise<void> {
        this.system.add(amount);
        console.log(`Awarded ${amount} credits: ${reason}`);
    }

    async spendCredits(amount: number, reason: string): Promise<boolean> {
        if (this.system.balance >= amount) {
            this.system.subtract(amount);
            console.log(`Spent ${amount} credits: ${reason}`);
            return true;
        }
        return false;
    }
}

async function testCreditFlow() {
    console.log("Testing CreditSystem flow...");
    const service = new MockCreditService();

    // Initial state
    if (await service.getBalance() !== 0) throw new Error("Initial balance should be 0");

    // Award
    await service.awardCredits(100, "Mission Complete");
    if (await service.getBalance() !== 100) throw new Error("Balance should be 100");

    // Spend
    const success = await service.spendCredits(50, "Buy Upgrade");
    if (!success) throw new Error("Should be able to spend 50");
    if (await service.getBalance() !== 50) throw new Error("Balance should be 50");

    // Overspend
    const fail = await service.spendCredits(100, "Buy Expensive Thing");
    if (fail) throw new Error("Should not be able to overspend");
    if (await service.getBalance() !== 50) throw new Error("Balance should remain 50");

    console.log("PASS");
}

testCreditFlow()
    .then(() => console.log("\\nALL GAMIFICATION TESTS PASSED"))
    .catch((e) => {
        console.error(`\\nTEST FAILED: ${e}`);
        process.exit(1);
    });