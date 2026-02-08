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
import { CommsPane } from '../components/CommsPane';
import { StatusBar } from '../components/StatusBar';
import { MainframeOverlay } from '../components/MainframeOverlay';
import { TheatricalCanvas } from '../components/theatrical/TheatricalCanvas';
import { EconomyBar } from '../components/EconomyBar';

import { ShellScreen } from './ShellScreen';
import { VimScreen } from './VimScreen';
import { BufferScreen } from './BufferScreen';

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
    const { gameManager, commandCoordinator } = useProcess();
    const { tutorShadow } = useTutorPersona();
    const { theme } = useTheme();
    const components = useThemeComponents();
    const Layout = components.Layout;
    const colors = theme.colors;

    const viewModel = useTerminalViewModel(fs, commandCoordinator, gameManager, tutorShadow);

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

    const renderComms = () => (
        <Layout
            headerComponent={
                <StatusBar
                    status="COMMS LINK"
                    user={viewModel.state.environment.USER || "OPERATOR"}
                    connectionStatus={viewModel.state.fsContext ? 'SECURE' : 'LOCAL'}
                    activeMissionName={null}
                />
            }
            status="ENCRYPTED TRANSMISSION"
            topContent={
                <View style={{ flex: 1 }}>
                    <CommsPane
                        missions={viewModel.missions}
                        activeMissionId={viewModel.ircMissionId}
                        onMissionSelect={viewModel.setIrcMissionId}
                        onStartMission={viewModel.handleStartMission}
                        onAbandonMission={viewModel.handleAbandonMission}
                    />
                    <MainframeOverlay />
                    <TheatricalCanvas />
                </View>
            }
            middleContent={<FKeyBar keys={[
                { key: 'F2', label: 'CLOSE', action: viewModel.toggleCommsView },
                { key: 'ESC', label: 'BACK', action: viewModel.toggleCommsView }
            ]} />}
            bottomContent={<View style={styles.footerPlaceholder} />}
            tutorBarComponent={<GlobalTutorBar />}
            economyBarComponent={<EconomyBar />}
        />
    );

    const renderBuffers = () => (
        <Layout
            headerComponent={
                <StatusBar
                    status="ARCHIVE"
                    user={viewModel.state.environment.USER || "OPERATOR"}
                    connectionStatus={viewModel.state.fsContext ? 'SECURE' : 'LOCAL'}
                    activeMissionName={null}
                />
            }
            status="RECOVERED DATA BANKS"
            topContent={
                <View style={{ flex: 1 }}>
                    <BufferScreen
                        buffers={viewModel.buffers}
                        onClose={viewModel.toggleBufferView}
                    />
                    <MainframeOverlay />
                    <TheatricalCanvas />
                </View>
            }
            middleContent={<FKeyBar keys={[
                { key: 'F3', label: 'CLOSE', action: viewModel.toggleBufferView },
                { key: 'ESC', label: 'BACK', action: viewModel.toggleBufferView }
            ]} />}
            bottomContent={<View style={styles.footerPlaceholder} />}
            tutorBarComponent={<GlobalTutorBar />}
            economyBarComponent={<EconomyBar />}
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
        if (viewModel.activeView === 'COMMS') return renderComms();
        if (viewModel.activeView === 'BUFFERS') return renderBuffers();
        return renderShell();
    };

    return (
        <View style={styles.container}>
            {renderActiveContent()}
            {viewModel.isTransitioning && <View style={crtStyle} />}
        </View>
    );
};
