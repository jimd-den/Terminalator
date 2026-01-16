/**
 * SettingsRepository - Domain Layer Port
 * 
 * Interface for persisting and retrieving user configurations.
 * 
 * Pillar: THE SHADOW’S VEIL (Clean Architecture) - Ports
 */

import { UserSettings } from '../entities/Settings';

export interface SettingsRepository {
    saveSettings(settings: UserSettings): Promise<void>;
    loadSettings(): Promise<UserSettings>;
}
