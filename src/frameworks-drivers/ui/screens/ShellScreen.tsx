/**
 * ShellScreen - Presentation Layer (UI)
 *
 * Manages the Shell Experience, including the Console Layout,
 * Input Bar, Output Log, and the toggleable Comms Pane.
 *
 * Pillar: The Four-Fold Shield (SRP Separation)
 * Pillar: The Balanced Scale (Composition)
 */

import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { THEME } from '../Theme';
import { CommsPane } from '../components/CommsPane';
import { StatusBar } from '../components/StatusBar';
import { useShellView } from '../components/ShellView';
import { GlobalTutorBar } from '../components/GlobalTutorBar';
import { useInput } from '../context/InputContext';
import { useTheme, useThemeComponents } from '../context/ThemeContext';
import { useSystemState } from '../context/SystemStateProvider';
import { TerminalStateDTO } from '../../../domain/dtos/TerminalStateDTO';
import { MissionDTO } from '../../../domain/dtos/MissionDTO';
import { BufferScreen } from './BufferScreen';
import { BufferDTO } from '../../../domain/dtos/BufferDTO';
import { FKeyBar, FKeyDef } from '../components/FKeyBar';
import { MainframeOverlay } from '../components/MainframeOverlay';
import { TheatricalCanvas } from '../components/theatrical/TheatricalCanvas';
import { EconomyBar } from '../components/EconomyBar';

export interface ShellScreenProps {
    // State
    state: TerminalStateDTO;
    input: string;
    ghostText: string;
    outputLines: any[];
    renderedLineCount: number;
    tutorEmotion: any;
    crashingIndices: number[];
    contextualHint: string | null;
    missions: MissionDTO[];
    buffers: BufferDTO[];

    // View State
    activeView: 'SHELL' | 'COMMS' | 'BUFFERS';
    ircMissionId: string | null;

    // Actions
    markLineComplete: () => void;
    handleKeyPress: (key: string) => void;
    toggleCommsView: () => void;
    toggleBufferView: () => void;
    setIrcMissionId: (id: string | null) => void;
    handleStartMission: (id: string) => void;
    handleAbandonMission: (id: string) => void;
    saveToArchive: (index: number) => void;
    toggleMinimize: (index: number) => void;
    deleteGroup: (index: number) => void;
}

export const ShellScreen: React.FC<ShellScreenProps> = (props) => {
    const { theme } = useTheme();
    const components = useThemeComponents();
    const { isInputLocked } = useSystemState();
    const Layout = components.Layout;
    const { setOnInput, setOnKeyPress, refocus } = useInput();

    // -- Input Handling --
    // Wire up the global InputContext to this screen's handler
    useEffect(() => {
        setOnInput((text) => {
            if (isInputLocked) return;
            for (const char of text) {
                props.handleKeyPress(char);
            }
        });
        setOnKeyPress((key) => {
            if (isInputLocked) return;
            props.handleKeyPress(key);
        });
        // Ensure focus when mounting/switching back to shell
        // Timeout to allow layout to settle if transitioning
        const timer = setTimeout(refocus, 50);
        return () => clearTimeout(timer);
    }, [props.handleKeyPress, setOnInput, setOnKeyPress, refocus]);

    // -- F-Key Routing --
    const handleFKeyAction = (action: string) => {
        if (action === 'HELP') {
            // Macro: "help\n"
            // We dispatch individually to simulate typing or just call handler?
            // The old code simulated typing. Let's stick to that for pure simulation.
            ['h', 'e', 'l', 'p', 'ENTER'].forEach(k => props.handleKeyPress(k));
        } else if (action === 'IRC') {
            props.toggleCommsView();
        } else if (action === 'BUFFERS') {
            props.toggleBufferView();
        }
    };

    // -- Derived View Content --
    const keys: FKeyDef[] = [
        { key: 'F1', label: 'HELP', action: () => handleFKeyAction('HELP') },
        { key: 'F2', label: 'COMMS', action: () => handleFKeyAction('IRC') },
        { key: 'F3', label: 'ARCHIVE', action: () => handleFKeyAction('BUFFERS') },
        { key: 'TAB', label: 'AUTO', action: () => props.handleKeyPress('TAB') },
        { key: '▲', label: 'UP', action: () => props.handleKeyPress('UP') },
        { key: '▼', label: 'DOWN', action: () => props.handleKeyPress('DOWN') },
        { key: 'ENT', label: 'EXEC', action: () => props.handleKeyPress('ENTER') },
    ];

    // -- View Composition --
    const shellView = useShellView({
        outputLines: props.outputLines,
        renderedLineCount: props.renderedLineCount,
        markLineComplete: props.markLineComplete,
        input: props.input,
        ghostText: props.ghostText,
        user: props.state.environment.USER || 'operator',
        hostname: props.state.fsContext || props.state.environment.HOSTNAME || 'system',
        tutorEmotion: props.tutorEmotion,
        crashingIndices: props.crashingIndices,
        contextualHint: props.contextualHint,
        onRefocus: refocus,
        onKeyPress: props.handleKeyPress,
        onFKeyAction: handleFKeyAction,
        onSave: props.saveToArchive,
        onMinimize: props.toggleMinimize,
        onDelete: props.deleteGroup
    });

    // -- Derived State --
    const activeMission = props.missions.find(m => m.status === 'active');
    const missionName = activeMission ? activeMission.type.toUpperCase() : null;
    const statusText = "OPERATIONAL";

    // -- View Composition --
    const mainLayout = (
        <View style={{ flex: 1 }}>
            {shellView.topContent}
            <MainframeOverlay />
            <TheatricalCanvas />
        </View>
    );

    const statusBar = (
        <StatusBar
            status={props.state.fsContext ? "REMOTE" : "OPERATIONAL"}
            user={props.state.environment.USER || "OPERATOR"}
            connectionStatus={props.state.fsContext ? 'SECURE' : 'LOCAL'}
            activeMissionName={missionName}
        />
    );

    return (
        <Layout
            headerComponent={statusBar}
            status={statusText}
            topContent={mainLayout}
            middleContent={<FKeyBar keys={keys} />}
            bottomContent={shellView.bottomContent}
            tutorBarComponent={<GlobalTutorBar />}
            economyBarComponent={<EconomyBar />}
        />
    );
};
