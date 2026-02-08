/**
 * useHeadlessTerminal - Interface Adapter Layer
 *
 * A "Headless" ViewModel for the Terminal.
 * Decouples the terminal state from specific UI implementations.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Universal Interface (Headless Pattern)
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { FileSystem } from '../../domain/entities/FileSystem';
import { CommandCoordinator } from '../controllers/CommandCoordinator';
import { GameManager } from '../GameManager';
import { TutorShadow } from '../../domain/services/tutor/TutorShadow';
import { ArchiveService, CapturedBuffer } from '../../domain/services/ArchiveService';
import { HintService } from '../../domain/services/HintService';
import { BufferMapper } from '../mappers/BufferMapper';
import { SimulationMediator } from '../../core/presentation/SimulationMediator';

// Import Decomposed ViewModels
import { useShellViewModel } from './useShellViewModel';
import { useMissionViewModel } from './useMissionViewModel';

export type ActiveView = 'SHELL' | 'COMMS' | 'BUFFERS';

export const useHeadlessTerminal = (
    fs: FileSystem,
    commandCoordinator: CommandCoordinator,
    gameManager: GameManager,
    tutorShadow: TutorShadow,
    simulationMediator: SimulationMediator
) => {
    // -- View State (Top Level UI) --
    const [activeView, setActiveView] = useState<ActiveView>('SHELL');
    const [contextualHint, setContextualHint] = useState<string | null>(null);
    const lastActivityRef = useRef<number>(Date.now());

    // -- Sub-ViewModels --
    const missionVM = useMissionViewModel(gameManager);
    const shellVM = useShellViewModel(
        fs, 
        commandCoordinator as any, 
        gameManager, 
        tutorShadow, 
        missionVM.refreshMissions,
        simulationMediator
    );

    const archiveService = useMemo(() => new ArchiveService(), []);
    const hintService = useMemo(() => new HintService(), []);
    const [buffers, setBuffers] = useState<CapturedBuffer[]>([]);

    // -- Buffer Logic (Archive) --
    const saveToArchive = useCallback((index: number) => {
        archiveService.recordFromOutput(
            index,
            shellVM.outputLines,
            shellVM.fsContext || 'LOCAL'
        );
        setBuffers(archiveService.getAll());
    }, [shellVM.outputLines, archiveService, shellVM.fsContext]);

    const toggleBufferView = useCallback(() => {
        setActiveView(prev => prev === 'BUFFERS' ? 'SHELL' : 'BUFFERS');
    }, []);

    const toggleCommsView = useCallback(() => {
        setActiveView(prev => prev === 'COMMS' ? 'SHELL' : 'COMMS');
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
            if (idleTime > 15000 && !contextualHint) {
                const hint = hintService.getHint(
                    missionVM.missions,
                    gameManager.tutorEngine.isActive(),
                    !!shellVM.fsContext
                );
                setContextualHint(hint);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [contextualHint, missionVM.missions, shellVM.fsContext, gameManager, hintService]);

    const handleKeyPressWrapped = useCallback((key: string) => {
        resetInactivityTimer();
        shellVM.handleKeyPress(key);
    }, [shellVM.handleKeyPress, resetInactivityTimer]);

    // -- F-Key / Macro Actions --
    const handleAction = useCallback((action: string) => {
        if (action === 'HELP') {
            ['h', 'e', 'l', 'p', 'ENTER'].forEach(k => handleKeyPressWrapped(k));
        } else if (action === 'COMMS') {
            toggleCommsView();
        } else if (action === 'BUFFERS') {
            toggleBufferView();
        }
    }, [handleKeyPressWrapped, toggleCommsView, toggleBufferView]);

    const fKeys = useMemo(() => [
        { key: 'F1', label: 'HELP', action: () => handleAction('HELP') },
        { key: 'F2', label: 'COMMS', action: () => handleAction('COMMS') },
        { key: 'F3', label: 'ARCHIVE', action: () => handleAction('BUFFERS') },
        { key: 'TAB', label: 'AUTO', action: () => handleKeyPressWrapped('TAB') },
        { key: '▲', label: 'UP', action: () => handleKeyPressWrapped('UP') },
        { key: '▼', label: 'DOWN', action: () => handleKeyPressWrapped('DOWN') },
        { key: 'ENT', label: 'EXEC', action: () => handleKeyPressWrapped('ENTER') },
    ], [handleAction, handleKeyPressWrapped]);

    return {
        // App State
        activeApp: shellVM.activeApp,
        state: shellVM.state,
        contextualHint,
        activeView,
        isTransitioning: shellVM.isTransitioning,

        // Actions
        fKeys,
        handleAction,
        handleKeyPress: handleKeyPressWrapped,
        handleVimExit: shellVM.handleVimExit,
        toggleCommsView,
        toggleBufferView,

        // Mission State
        ircMissionId: missionVM.ircMissionId,
        setIrcMissionId: missionVM.setIrcMissionId,
        missions: missionVM.missions,
        handleStartMission: (id: string) => {
            const minimalState = { fsContext: shellVM.fsContext } as any;
            gameManager.startMission(id, minimalState);
            missionVM.refreshMissions();
        },
        handleAbandonMission: missionVM.handleAbandonMission,

        // Shell/Input State
        input: shellVM.input,
        ghostText: shellVM.ghostText,
        handleInputChange: shellVM.handleInputChange,

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
        buffers: buffers.map(BufferMapper.toDTO),
        saveToArchive,
    };
};
