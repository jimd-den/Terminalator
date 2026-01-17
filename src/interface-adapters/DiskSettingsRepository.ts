/**
 * AsyncSettingsRepository - Interface Adapter Layer
 * 
 * Implements persistence using AsyncStorage (or a mock if unavailable).
 * For this environment, we'll try to use a simple file-based persistence 
 * via the simulated FileSystem to keep it "in-universe".
 * 
 * Pillar: THE SHADOW’S VEIL (Clean Architecture) - Adapters
 */

import { SettingsRepository } from '../domain/ports/SettingsRepository';
import { UserSettings, DEFAULT_SETTINGS } from '../domain/entities/Settings';
import { FileSystem } from '../domain/entities/FileSystem';

export class DiskSettingsRepository implements SettingsRepository {
    private fs: FileSystem;
    private readonly SETTINGS_PATH = '/etc/settings.json';

    constructor(fs: FileSystem) {
        this.fs = fs;
    }

    async saveSettings(settings: UserSettings): Promise<void> {
        const data = JSON.stringify(settings);
        this.fs.writeFile(this.SETTINGS_PATH, data, 'w');
    }

    async loadSettings(): Promise<UserSettings> {
        try {
            const data = this.fs.readFile(this.SETTINGS_PATH);
            return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
        } catch (e) {
            return DEFAULT_SETTINGS;
        }
    }
}
