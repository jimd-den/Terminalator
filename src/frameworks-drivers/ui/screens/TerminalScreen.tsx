/**
 * TerminalScreen - Presentation Layer
 * 
 * The core UI of the "Terminalator".
 * Features a high-contrast, two-box layout inspired by "Aliens" and Grid computers.
 * Follows Nintendo/Jack Dorsey principles: Large, intuitive, focused.
 *
 * Pillar: The Storyteller’s Code (Literate Documentation)
 * Pillar: The Balanced Scale (KISS)
 *
 * Intent:
 * Connects the user input to the domain logic (Command Executor).
 * Renders the system state (output lines, ghost text, CRT effects).
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { FKeyBar } from '../components/FKeyBar';
import { GlobalTutorBar } from '../components/GlobalTutorBar';
import { useFileSystem } from '../context/FileSystemProvider';
import { useProcess } from '../context/ProcessProvider';
import { useTutorPersona } from '../context/TutorPersonaProvider';
import { useTerminalViewModel } from '../../../interface-adapters/viewmodels/TerminalViewModel';
import { useTheme, useThemeComponents } from '../context/ThemeContext';
import { StatusBar } from '../components/StatusBar';
import { RhythmHUD } from '../components/theatrical/RhythmHUD';
import { EconomyBar } from '../components/EconomyBar';

import { ShellScreen } from './ShellScreen';
import { VimScreen } from './VimScreen';

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    footerPlaceholder: {
        height: 40,
    }
});

export const TerminalScreen: React.FC = () => {
    const { fs } = useFileSystem();
    const { gameManager, commandCoordinator, simulationMediator } = useProcess();
    const { tutorShadow } = useTutorPersona();
    const { theme } = useTheme();
    const components = useThemeComponents();
    const Layout = components.Layout;
    const colors = theme.colors;

    const viewModel = useTerminalViewModel(fs, commandCoordinator, gameManager, tutorShadow, simulationMediator);

    const crtStyle = {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: colors.background,
        zIndex: 999,
    };

    // -- Sub-View Rendering --

    const renderVim = () => (
        <VimScreen
            filename={viewModel.activeApp.type === 'VIM' ? viewModel.activeApp.filename : ''}
            onExit={viewModel.handleVimExit}
        />
    );

    const renderShell = () => (
        <ShellScreen
            state={viewModel.state}
            input={viewModel.input}
            ghostText={viewModel.ghostText}
            outputLines={viewModel.outputLines}
            renderedLineCount={viewModel.renderedLineCount}
            tutorEmotion={viewModel.tutorEmotion}
            crashingIndices={viewModel.crashingIndices}
            contextualHint={viewModel.contextualHint}
            missions={viewModel.missions}
            buffers={viewModel.buffers}
            activeView={viewModel.activeView}
            ircMissionId={viewModel.ircMissionId}
            fKeys={viewModel.fKeys}
            handleAction={viewModel.handleAction}
            markLineComplete={viewModel.markLineComplete}
            handleKeyPress={viewModel.handleKeyPress}
            toggleCommsView={viewModel.toggleCommsView}
            toggleBufferView={viewModel.toggleBufferView}
            setIrcMissionId={viewModel.setIrcMissionId}
            handleStartMission={viewModel.handleStartMission}
            handleAbandonMission={viewModel.handleAbandonMission}
            saveToArchive={viewModel.saveToArchive}
            toggleMinimize={viewModel.toggleMinimize}
            deleteGroup={viewModel.deleteGroup}
        />
    );

    // Main Dispatcher
    const renderActiveContent = () => {
        if (viewModel.activeApp.type === 'VIM') return renderVim();
        // Comms and Buffers are now rendered inline via 'irc' and 'archive' commands in the Shell
        // if (viewModel.activeView === 'COMMS') return renderComms();
        // if (viewModel.activeView === 'BUFFERS') return renderBuffers();
        return renderShell();
    };

    return (
        <View style={styles.container}>
            {renderActiveContent()}
            {viewModel.isTransitioning && <View style={crtStyle} />}
        </View>
    );
};
