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
import { useGame } from '../context/GameContext';
import { useVimEditor } from '../components/vim/VimEditor';
import { useInput } from '../context/InputContext';
import { useTerminalViewModel } from '../../../interface-adapters/viewmodels/TerminalViewModel';
import { useTheme } from '../context/ThemeContext';
import { CommsPane } from '../components/CommsPane';
import { useShellView } from '../components/ShellView';
import { StatusBar } from '../components/StatusBar';

export const TerminalScreen: React.FC = () => {
    const { fs, gameManager, commandExecutor } = useGame();
    const { theme } = useTheme();
    const colors = theme.colors;

    const {
        activeApp,
        state,
        input,
        tutorEmotion,
        crashingIndices,
        outputLines,
        ghostText,
        contextualHint,
        activeView,
        ircMissionId,
        setIrcMissionId,
        toggleCommsView,
        isTransitioning,
        missions,
        handleKeyPress,
        handleVimExit,
        handleStartMission,
        handleAbandonMission,
        renderedLineCount,
        markLineComplete
    } = useTerminalViewModel(fs, commandExecutor, gameManager);

    const isShell = activeApp.type === 'SHELL';
    const vimFilename = activeApp.type === 'VIM' ? activeApp.filename : '';

    const vim = useVimEditor(vimFilename, handleVimExit);

    const handleFKeyAction = (action: string) => {
        if (action === 'HELP') {
            handleKeyPress('h'); handleKeyPress('e'); handleKeyPress('l'); handleKeyPress('p'); handleKeyPress('ENTER');
        } else if (action === 'IRC') {
            toggleCommsView();
        }
    };

    const shell = useShellView({
        outputLines,
        renderedLineCount,
        markLineComplete,
        input,
        ghostText,
        user: state.environment.USER,
        hostname: state.fsContext || state.environment.HOSTNAME || 'system',
        tutorEmotion,
        crashingIndices,
        contextualHint,
        onRefocus: useInput().refocus,
        onKeyPress: handleKeyPress,
        onFKeyAction: handleFKeyAction
    });

    const status = isShell ? (activeView === 'COMMS' ? "COMMS LINK ACTIVE" : "OPERATIONAL") : `EDITING: ${vimFilename}`;

    const { setOnInput, setOnKeyPress } = useInput();

    React.useEffect(() => {
        if (isShell) {
            setOnInput((text) => {
                for (const char of text) {
                    handleKeyPress(char);
                }
            });
            setOnKeyPress((key) => {
                handleKeyPress(key);
            });
        }
    }, [isShell, handleKeyPress, setOnInput, setOnKeyPress]);

    const styles = StyleSheet.create({
        crtBlinkOverlay: {
            ...StyleSheet.absoluteFillObject,
            backgroundColor: colors.background,
            zIndex: 999,
        }
    });

    // Content Switching
    let mainContent;
    if (activeView === 'COMMS') {
        mainContent = (
            <CommsPane
                missions={missions}
                activeMissionId={ircMissionId}
                onMissionSelect={setIrcMissionId}
                onStartMission={handleStartMission}
                onAbandonMission={handleAbandonMission}
            />
        );
    } else {
        mainContent = isShell ? shell.topContent : vim.topContent;
    }

    // Calculate active mission name
    const activeMission = missions.find(m => m.status === 'active');
    const missionName = activeMission ? activeMission.type.toUpperCase() : null;

    return (
        <ConsoleLayout
            headerComponent={
                isShell ? (
                    <StatusBar
                        status={activeView === 'COMMS' ? "COMMS LINK" : (state.fsContext ? "REMOTE" : "OPERATIONAL")}
                        user={state.environment.USER || "OPERATOR"}
                        connectionStatus={state.fsContext ? 'SECURE' : 'LOCAL'}
                        activeMissionName={missionName}
                    />
                ) : undefined
            }
            status={status}
            topContent={mainContent}
            middleContent={isShell ? shell.middleContent : vim.middleContent}
            bottomContent={isShell ? shell.bottomContent : vim.bottomContent}
        >
            {isTransitioning && <View style={styles.crtBlinkOverlay} />}
        </ConsoleLayout>
    );
};
