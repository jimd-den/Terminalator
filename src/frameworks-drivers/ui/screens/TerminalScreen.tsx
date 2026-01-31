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
import { ConsoleLayout } from '../components/ConsoleLayout';
import { FKeyBar } from '../components/FKeyBar';
import { useGame } from '../context/GameContext';
import { useVimEditor } from '../components/vim/VimEditor';
import { useInput } from '../context/InputContext';
import { useTerminalViewModel } from '../../../interface-adapters/viewmodels/TerminalViewModel';
import { useTheme } from '../context/ThemeContext';
import { CommsPane } from '../components/CommsPane';
import { useShellView } from '../components/ShellView';
import { StatusBar } from '../components/StatusBar';

import { ShellScreen } from './ShellScreen';
import { VimScreen } from './VimScreen';
import { BufferScreen } from './BufferScreen';

export const TerminalScreen: React.FC = () => {
    const { fs, gameManager, commandExecutor } = useGame();
    const { theme } = useTheme();
    const colors = theme.colors;

    const viewModel = useTerminalViewModel(fs, commandExecutor, gameManager);

    const isShell = viewModel.activeApp.type === 'SHELL';
    const vimFilename = viewModel.activeApp.type === 'VIM' ? viewModel.activeApp.filename : '';

    const styles = StyleSheet.create({
        crtBlinkOverlay: {
            ...StyleSheet.absoluteFillObject,
            backgroundColor: colors.background,
            zIndex: 999,
        }
    });

    return (
        <View style={{ flex: 1 }}>
            {viewModel.activeApp.type === 'VIM' ? (
                <VimScreen
                    filename={vimFilename}
                    onExit={viewModel.handleVimExit}
                />
            ) : viewModel.activeView === 'COMMS' ? (
                <ConsoleLayout
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
                        <CommsPane
                            missions={viewModel.missions}
                            activeMissionId={viewModel.ircMissionId}
                            onMissionSelect={viewModel.setIrcMissionId}
                            onStartMission={viewModel.handleStartMission}
                            onAbandonMission={viewModel.handleAbandonMission}
                        />
                    }
                    middleContent={<FKeyBar keys={[
                        { key: 'F2', label: 'CLOSE', action: viewModel.toggleCommsView },
                        { key: 'ESC', label: 'BACK', action: viewModel.toggleCommsView }
                    ]} />}
                    bottomContent={<View style={{ height: 40 }} />} // Placeholder/Footer
                />
            ) : viewModel.activeView === 'BUFFERS' ? (
                <ConsoleLayout
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
                        <BufferScreen
                            buffers={viewModel.buffers}
                            onClose={viewModel.toggleBufferView}
                        />
                    }
                    middleContent={<FKeyBar keys={[
                        { key: 'F3', label: 'CLOSE', action: viewModel.toggleBufferView },
                        { key: 'ESC', label: 'BACK', action: viewModel.toggleBufferView }
                    ]} />}
                    bottomContent={<View style={{ height: 40 }} />} // Placeholder/Footer
                />
            ) : (
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
                />
            )}
            {viewModel.isTransitioning && <View style={styles.crtBlinkOverlay} />}
        </View>
    );
};
