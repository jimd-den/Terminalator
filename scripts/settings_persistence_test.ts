import { DiskSettingsRepository } from '../src/interface-adapters/DiskSettingsRepository';
import { FileSystem } from '../src/domain/entities/FileSystem';
import { FileSystemService } from '../src/domain/services/FileSystemService';
import { UserSettings, DEFAULT_SETTINGS } from '../src/domain/entities/Settings';

async function testSettingsPersistence() {
    console.log("Testing DiskSettingsRepository persistence for forceKeyboardOpen...");
    
    const fs = new FileSystem();
    const service = new FileSystemService(fs);
    service.mkdir('/etc');
    const repo = new DiskSettingsRepository(service);

    // 1. Initial load should have default (false)
    const initial = await repo.loadSettings();
    if (initial.forceKeyboardOpen !== false) {
        throw new Error("Expected initial forceKeyboardOpen to be false");
    }

    // 2. Save with true
    const updated: UserSettings = { ...initial, forceKeyboardOpen: true };
    await repo.saveSettings(updated);

    // 3. Load again, should be true
    const loaded = await repo.loadSettings();
    if (loaded.forceKeyboardOpen !== true) {
        throw new Error("Expected loaded forceKeyboardOpen to be true");
    }

    console.log("PASS");
}

testSettingsPersistence().catch(e => {
    console.error(`
TEST FAILED: ${e.message}`);
    process.exit(1);
});
