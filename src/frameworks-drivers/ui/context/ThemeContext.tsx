/**
 * ThemeSelection - Presentation Layer
 * 
 * Provides dynamic theaming and font management to the component tree.
 * 
 * Pillar: THE FOUR-FOLD SHIELD (Clean Architecture)
 * Pillar: THE STORYTELLER’S CODE (Literate Documentation)
 */

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { THEMES, ThemeDefinition, ThemeColors } from '../../../domain/entities/Theme';
import { UserSettings, DEFAULT_SETTINGS } from '../../../domain/entities/Settings';
import { useGame } from './GameContext';
import { DiskSettingsRepository } from '../../../interface-adapters/DiskSettingsRepository';

interface ThemeContextType {
    theme: ThemeDefinition;
    settings: UserSettings;
    setTheme: (id: string) => void;
    setFont: (font: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { fs } = useGame();
    const settingsRepo = useMemo(() => new DiskSettingsRepository(fs), [fs]);

    const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);

    // Initial load
    useEffect(() => {
        settingsRepo.loadSettings().then(setSettings);
    }, [settingsRepo]);

    const theme = useMemo(() => THEMES[settings.themeId] || THEMES.matrix, [settings.themeId]);

    const setTheme = async (id: string) => {
        if (THEMES[id]) {
            const next = { ...settings, themeId: id };
            setSettings(next);
            await settingsRepo.saveSettings(next);
        }
    };

    const setFont = async (font: string) => {
        const next = { ...settings, fontFamily: font };
        setSettings(next);
        await settingsRepo.saveSettings(next);
    };

    return (
        <ThemeContext.Provider value={{ theme, settings, setTheme, setFont }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
