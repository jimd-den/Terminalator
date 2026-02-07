/**
 * VimScreen - Presentation Layer (UI)
 *
 * Manages the Vim Editor Experience.
 * Wraps the VimEditor hook and renders the layout.
 *
 * Pillar: The Four-Fold Shield (SRP Separation)
 * Pillar: The Balanced Scale (Composition)
 */

import React from 'react';
import { View } from 'react-native';
import { useVimEditor } from '../components/vim/VimEditor';
import { GlobalTutorBar } from '../components/GlobalTutorBar';
import { EconomyBar } from '../components/EconomyBar';
import { useTheme, useThemeComponents } from '../context/ThemeContext';
import { MainframeOverlay } from '../components/MainframeOverlay';

export interface VimScreenProps {
    filename: string;
    onExit: () => void;
}

export const VimScreen: React.FC<VimScreenProps> = ({ filename, onExit }) => {
    const components = useThemeComponents();
    const Layout = components.Layout;
    
    // -- Vim Logic --
    // The `useVimEditor` hook encapsulates the complex editor state,
    // input handling, and syntax highlighting.
    const vim = useVimEditor(filename, onExit);

    const topContent = (
        <View style={{ flex: 1 }}>
            {vim.topContent}
            <MainframeOverlay />
        </View>
    );

    return (
        <Layout
            status={`EDITING: ${filename}`}
            topContent={topContent}
            middleContent={vim.middleContent}
            bottomContent={vim.bottomContent}
            tutorBarComponent={<GlobalTutorBar />}
            economyBarComponent={<EconomyBar />}
        />
    );
};
