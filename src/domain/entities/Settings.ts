/**
 * UserSettings - Domain Layer Entity
 * 
 * Represents the persistent configuration for the terminal environment.
 * 
 * Pillar: THE SHADOW’S VEIL (Clean Architecture) - Entities
 */

export interface UserSettings {
    themeId: string;
    fontFamily: string;
    fontSize: number;
    forceKeyboardOpen: boolean;
}

export const DEFAULT_SETTINGS: UserSettings = {
    themeId: 'matrix',
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 18,
    forceKeyboardOpen: true
};
