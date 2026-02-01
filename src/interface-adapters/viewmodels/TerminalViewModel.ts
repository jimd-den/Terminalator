/**
 * TerminalViewModel - Interface Adapter Layer
 *
 * " The Humble Composition Root "
 *
 * Manages the high-level orchestration of the Terminal Screen.
 * Composes specialized ViewModels to drive the UI.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Balanced Scale (Composition > Inheritance)
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { FileSystem } from '../../domain/entities/FileSystem';
import { ExecuteCommand } from '../../domain/usecases/ExecuteCommand';
import { GameManager } from '../GameManager';
import { ArchiveService, CapturedBuffer } from '../../domain/services/ArchiveService';
import { BufferMapper } from '../mappers/BufferMapper';

// Import Decomposed ViewModels
import { useShellViewModel } from './useShellViewModel';
import { useMissionViewModel } from './useMissionViewModel';

export type ActiveView = 'SHELL' | 'COMMS' | 'BUFFERS';
export { TerminalOutputLine } from '../controllers/OutputController';

export const useTerminalViewModel = (
    fs: FileSystem,
    commandExecutor: ExecuteCommand,
    gameManager: GameManager
) => {
    // -- View State (Top Level UI) --
    const [activeView, setActiveView] = useState<ActiveView>('SHELL');
    const [contextualHint, setContextualHint] = useState<string | null>(null);
    const lastActivityRef = useRef<number>(Date.now());

    // -- Sub-ViewModels --
    const missionVM = useMissionViewModel(gameManager);

    // We pass a setter to update mission state from shell (e.g. if command triggers update)
    const shellVM = useShellViewModel(fs, commandExecutor, gameManager, missionVM.refreshMissions);

    const archiveService = useMemo(() => new ArchiveService(), []);
    const [buffers, setBuffers] = useState<CapturedBuffer[]>([]);

    // -- Buffer Logic (Archive) --
    // Kept here as it bridges Shell Output -> Archive Storage
    const saveToArchive = useCallback((index: number) => {
        const lines = shellVM.outputLines;
        const cmdLine = lines[index];
        if (!cmdLine || cmdLine.type !== 'input') return;

        const command = cmdLine.text.replace(/^>\s*/, '');
        const blockOutput = [];
        for (let i = index + 1; i < lines.length; i++) {
            if (lines[i].type === 'input') break;
            blockOutput.push(lines[i]);
        }
        archiveService.record(
            command,
            blockOutput,
            shellVM.fsContext || 'LOCAL',
            cmdLine.exitCode
        );
        setBuffers(archiveService.getAll());
    }, [shellVM.outputLines, archiveService, shellVM.fsContext]);

    const toggleBufferView = useCallback(() => {
        setActiveView(prev => prev === 'BUFFERS' ? 'SHELL' : 'BUFFERS');
    }, []);

    const toggleCommsView = useCallback(() => {
        setActiveView(prev => prev === 'COMMS' ? 'SHELL' : 'COMMS');
        // Auto-select mission logic
        if (activeView !== 'COMMS' && !missionVM.ircMissionId) {
            const active = missionVM.missions.find(m => m.status === 'active');
            missionVM.setIrcMissionId(active ? active.id : (missionVM.missions[0]?.id || null));
        }
    }, [activeView, missionVM.ircMissionId, missionVM.missions, missionVM.setIrcMissionId]);

    // -- Contextual Hint System --
    const resetInactivityTimer = useCallback(() => {
        lastActivityRef.current = Date.now();
        if (contextualHint) setContextualHint(null);
    }, [contextualHint]);

    useEffect(() => {
        const interval = setInterval(() => {
            const idleTime = Date.now() - lastActivityRef.current;
            if (idleTime > 15000 && !contextualHint && !gameManager.tutorEngine.isActive()) {
                let hint = "[ HINT: TYPE 'help' FOR AVAILABLE COMMANDS ]";
                const activeMission = missionVM.missions.find(m => m.status === 'active');

                if (activeMission) {
                    if (activeMission.currentStep === 'PENDING') hint = "[ HINT: ESTABLISH CONNECTION TO TARGET SYSTEM ]";
                    else if (activeMission.currentStep === 'CONNECTED') hint = "[ HINT: EXPLORE REMOTE DIRECTORY WITH 'ls' ]";
                    else if (activeMission.currentStep === 'LOCATED') hint = "[ HINT: ACQUIRE OBJECTIVE FILE ]";
                } else if (!shellVM.fsContext) {
                    hint = "[ HINT: CHECK 'mail' OR 'jobs' ]";
                }
                setContextualHint(hint);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [contextualHint, missionVM.missions, shellVM.fsContext, gameManager]);

    // Wrap key press to reset timer
    const handleKeyPressWrapped = useCallback((key: string) => {
        resetInactivityTimer();
        shellVM.handleKeyPress(key);
    }, [shellVM.handleKeyPress, resetInactivityTimer]);

    return {
        // App State
        activeApp: shellVM.activeApp,
        state: shellVM.state,
        contextualHint,
        activeView,
        isTransitioning: shellVM.isTransitioning,

        // Mission State
        ircMissionId: missionVM.ircMissionId,
        setIrcMissionId: missionVM.setIrcMissionId,
        missions: missionVM.missions,
        handleStartMission: missionVM.handleStartMission,
        handleAbandonMission: missionVM.handleAbandonMission,
        toggleCommsView,

        // Shell/Input State
        input: shellVM.input,
        ghostText: shellVM.ghostText,
        handleInputChange: shellVM.handleInputChange,
        handleKeyPress: handleKeyPressWrapped,
        handleVimExit: shellVM.handleVimExit,

        // Output State
        outputLines: shellVM.outputLines,
        renderedLineCount: shellVM.renderedLineCount,
        markLineComplete: shellVM.markLineComplete,
        toggleMinimize: shellVM.toggleMinimize,
        deleteGroup: shellVM.deleteGroup,

        // Tutor State
        tutorEmotion: shellVM.tutorEmotion,
        crashingIndices: shellVM.crashingIndices,

        // Buffer State
        archiveService,
        toggleBufferView,
        buffers: buffers.map(BufferMapper.toDTO),
        saveToArchive,
    };
};
