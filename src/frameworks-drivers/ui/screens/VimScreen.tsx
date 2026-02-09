/**
 * VimScreen - Presentation Layer (UI)
 *
 * Manages the Vim Editor Experience.
 * Wraps the VimEditor hook and renders the layout.
 *
 * Pillar: The Four-Fold Shield (SRP Separation)
 * Pillar: The Balanced Scale (Composition)
 */

import React, { useMemo } from 'react';
import { View } from 'react-native';
import { useVimEditor } from '../components/vim/VimEditor';
import { GlobalTutorBar } from '../components/GlobalTutorBar';
import { EconomyBar } from '../components/EconomyBar';
import { useTheme, useThemeComponents } from '../context/ThemeContext';
import { useFileSystem } from '../context/FileSystemProvider';
import { useProcess } from '../context/ProcessProvider';
import { useSystemState } from '../context/SystemStateProvider';
import { useTutorPersona } from '../context/TutorPersonaProvider';
import { MainframeOverlay } from '../components/MainframeOverlay';
import { TheatricalCanvas } from '../components/theatrical/TheatricalCanvas';
import { TutorOverlay } from '../components/theatrical/TutorOverlay';
import { FileSystemService } from '../../../domain/services/FileSystemService';

export interface VimScreenProps {
    filename: string;
    onExit: () => void;
}

export const VimScreen: React.FC<VimScreenProps> = ({ filename, onExit }) => {
    const components = useThemeComponents();
    const Layout = components.Layout;

    const { fs } = useFileSystem();
    const { gameManager } = useProcess();
    const { isInputLocked } = useSystemState();
    const { tutorShadow } = useTutorPersona();

    const fsService = useMemo(() => new FileSystemService(fs), [fs]);
    
    // -- Vim Logic --
    const vim = useVimEditor(
        filename, 
        onExit,
        fsService,
        gameManager.tutorEngine,
        tutorShadow,
        isInputLocked
    );

    const topContent = (
        <View style={{ flex: 1 }}>
            {vim.topContent}
            <MainframeOverlay />
            <TheatricalCanvas />
            <TutorOverlay />
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
