import { FileSystem } from '../../src/domain/entities/FileSystem';
import { DependencyContainer } from '../../src/infrastructure/di/DependencyContainer';

async function verifyPersistence() {
    console.log("=== Manual Verification: Persistence Layer ===");
    (global as any).__DEV__ = true;

    const fs = new FileSystem();

    // 1. Initial State
    console.log("[STEP 1] Initializing services...");
    const economyService = DependencyContainer.createEconomyService(fs);
    const masteryTracker = DependencyContainer.createMasteryTracker(fs);

    // 2. Change State
    console.log("[STEP 2] awarding ZINC and recording mastery...");
    // We can't easily award ZINC via service without mining, 
    // but we can manually write to wallet for testing if needed or just use recordHit
    for(let i=0; i<10; i++) economyService.recordHit(); 
    
    await masteryTracker.recordSuccess('ls');
    await masteryTracker.recordSuccess('ls');

    const balance1 = economyService.getBalance();
    const level1 = masteryTracker.getLevel('ls');
    console.log(`Current Balance: ${balance1}, ls Level: ${level1}`);

    // 4. Re-initialize (New instances, same FileSystem)
    console.log("[STEP 3] Re-initializing services (Simulating Restart)...");
    const economyService2 = DependencyContainer.createEconomyService(fs);
    const masteryTracker2 = DependencyContainer.createMasteryTracker(fs);

    // For the test, let's wait a bit.
    await new Promise(r => setTimeout(r, 200));

    const balance2 = economyService2.getBalance();
    const level2 = masteryTracker2.getLevel('ls');

    console.log(`Persisted Balance: ${balance2}, ls Level: ${level2}`);

    if (balance2 === 0 && balance1 > 0) {
        throw new Error(`Persistence Failed for ZINC: Expected > 0, got ${balance2}`);
    }
    
    // Let's add 3 more to reach COMPETENT
    await masteryTracker2.recordSuccess('ls');
    await masteryTracker2.recordSuccess('ls');
    await masteryTracker2.recordSuccess('ls');
    
    if (masteryTracker2.getLevel('ls') !== 'COMPETENT') {
        throw new Error(`Persistence Failed for Mastery: Expected COMPETENT, got ${masteryTracker2.getLevel('ls')}`);
    }

    console.log("=== Manual Verification Passed ===");
}

verifyPersistence().catch(e => {
    console.error(`[FAIL] Verification Failed: ${e}`);
    process.exit(1);
});