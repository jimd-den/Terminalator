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
import { RhythmHUD } from '../components/theatrical/RhythmHUD';
import { TutorOverlay } from '../components/theatrical/TutorOverlay';
import { ResultStackView } from '../components/theatrical/ResultStackView';
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
    fKeys: FKeyDef[];
    handleAction: (action: string) => void;
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
    }, [props.handleKeyPress, setOnInput, setOnKeyPress, refocus, isInputLocked]);

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
        onFKeyAction: props.handleAction,
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
            {/* Legacy output removed in favor of ResultStackView */}
            <ResultStackView />
            <MainframeOverlay />
            <TutorOverlay />
            <RhythmHUD />
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
            middleContent={<FKeyBar keys={props.fKeys} />}
            bottomContent={shellView.bottomContent}
            tutorBarComponent={<GlobalTutorBar />}
            economyBarComponent={<EconomyBar />}
        />
    );
};
