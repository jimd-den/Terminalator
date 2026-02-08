
import { FileSystem } from '../src/domain/entities/FileSystem';
import { FileSystemService } from '../src/domain/services/FileSystemService';
// @ts-ignore
import { DiskCreditRepository } from '../src/interface-adapters/DiskCreditRepository';
// @ts-ignore
import { DiskMasteryRepository } from '../src/interface-adapters/DiskMasteryRepository';

async function testPersistence() {
    console.log("=== Testing Persistence Layer (RED PHASE) ===");

    const fs = new FileSystem();
    const fsService = new FileSystemService(fs);

    // Test Credit Repository
    console.log("Testing DiskCreditRepository...");
    // @ts-ignore
    const creditRepo = new DiskCreditRepository(fsService);
    
    await creditRepo.saveCredits(1500);
    const credits = await creditRepo.getCredits();
    
    if (credits !== 1500) {
        throw new Error(`Expected 1500 credits, got ${credits}`);
    }
    console.log("Credit Persistence: PASS");

    // Test Mastery Repository
    console.log("Testing DiskMasteryRepository...");
    // @ts-ignore
    const masteryRepo = new DiskMasteryRepository(fsService);
    const testData = {
        successCounts: { 'ls': 5 },
        failureCounts: { 'ls': 1 }
    };
    
    await masteryRepo.saveMasteryData(testData);
    const masteryData = await masteryRepo.getMasteryData();
    
    if (masteryData.successCounts['ls'] !== 5) {
        throw new Error(`Expected 5 successes for ls, got ${masteryData.successCounts['ls']}`);
    }
    console.log("Mastery Persistence: PASS");
}

testPersistence().catch(e => {
    console.error(`
TEST FAILED: ${e}`);
    process.exit(1);
});
