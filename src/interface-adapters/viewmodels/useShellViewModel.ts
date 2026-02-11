/**
 * useShellViewModel - Interface Adapter Layer
 * 
 * " The Shell Core "
 * 
 * Manages the interactive shell environment, including input/output buffers,
 * command execution orchestration, and tutor integration.
 * 
 * Pillar: The Four-Fold Shield (Separation of Concerns)
 * Pillar: The Balanced Scale (Passive View)
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import { FileSystem } from '../../domain/entities/FileSystem';
import { FileSystemService } from '../../domain/services/FileSystemService';
import { ExecuteCommand } from '../../domain/usecases/ExecuteCommand';
import { IGameManager } from '../../domain/interfaces/IGameManager';
import { createInitialTerminalState, TerminalState } from '../../domain/entities/TerminalState';
import { TerminalStateMapper } from '../mappers/TerminalStateMapper';
import { AutocompleteService } from '../../domain/services/AutocompleteService';
import { GameEventObserver } from '../../domain/services/GameEventObserver';
import { ShellPresenter } from '../presenters/ShellPresenter';
import { useInputController } from '../controllers/InputController';
import { useOutputController, TerminalOutputLine } from '../controllers/OutputController';
import { useTutorController, TutorControllerCallbacks } from '../controllers/TutorController';
import { ShellController } from '../controllers/ShellController';
import { Lesson } from '../../domain/entities/TutorEngine';
import { TutorShadow } from '../../domain/services/tutor/TutorShadow';
import { SimulationMediator } from '../../core/presentation/SimulationMediator';
import { GameEventType, GameEvent } from '../../domain/services/SimulationBus';

export type ActiveApp = { type: 'SHELL' } | { type: 'VIM', filename: string };

export const useShellViewModel = (
    fs: FileSystem,
    commandExecutor: ExecuteCommand,
    gameManager: IGameManager,
    tutorShadow: TutorShadow,
    setMissions: (missions: any[]) => void, // Hook to update mission state from shell
    simulationMediator: SimulationMediator
) => {
    const navigation = useNavigation();

    // -- Services --
    const autocompleteService = useMemo(() => {
        return new AutocompleteService(new FileSystemService(fs));
    }, [fs]);

    const gameObserver = useMemo(() => {
        return new GameEventObserver(gameManager);
    }, [gameManager]);

    // -- Core State --
    const [state, setState] = useState<TerminalState>(createInitialTerminalState());
    const [activeApp, setActiveApp] = useState<ActiveApp>({ type: 'SHELL' });
    const [isTransitioning, setIsTransitioning] = useState(false);

    // [FIX] State Ref for async callbacks
    const stateRef = useRef(state);
    useEffect(() => { stateRef.current = state; }, [state]);

    // -- Controllers --
    const inputController = useInputController(
        autocompleteService,
        state.currentDirectory,
        () => gameManager.tutorEngine.isActive()
    );

    const outputController = useOutputController();

    // Command Execution Ref for Tutor
    const handleCommandRef = useRef<((cmd?: string) => Promise<void>) | null>(null);
    const pendingCommandRef = useRef<string | null>(null);

    // Subscribe to Summary Dismissed to execute pending commands
    useEffect(() => {
        const unsub = gameManager.getSimulationBus().subscribe(GameEventType.TUTOR_EVENT, (event) => {
            if (event.payload.type === 'SUMMARY_DISMISSED' && pendingCommandRef.current) {
                const cmd = pendingCommandRef.current;
                pendingCommandRef.current = null;
                if (handleCommandRef.current) {
                    handleCommandRef.current(cmd);
                }
            }
        });
        return unsub;
    }, [gameManager]);

    // Tutor Callbacks (Refactored logic)
    const tutorCallbacks: TutorControllerCallbacks = useMemo(() => ({
        onStart: (lesson: Lesson, targetCwd: string) => {
            const isMission = lesson.isMission || (lesson.id && lesson.id.startsWith('MISSION_'));
            if (isMission) return;
            setState(prev => ({ ...prev, currentDirectory: targetCwd }));
            outputController.appendLine(
                ShellPresenter.presentSystemMessage(`RELOCATING TO TRAINING ENVIRONMENT: ${targetCwd}...`)
            );
        },
        onStop: (originalCwd: string | null) => {
            const current = stateRef.current;
            const isMission = gameManager.tutorEngine.getCurrentLesson()?.isMission;
            if (originalCwd && !current.fsContext && !isMission) {
                setState(prev => ({ ...prev, currentDirectory: originalCwd }));
                outputController.appendLine(
                    ShellPresenter.presentSystemMessage(`TRAINING HALTED. RESTORING CONTEXT: ${originalCwd}`)
                );
            }
        },
        onProgress: (input: string, ghostText: string) => {
            inputController.setInput(input);
            inputController.updateGhostText(ghostText);
        },
        onCorrection: (input: string, ghostText: string) => {
            inputController.setInput(input);
            inputController.updateGhostText(ghostText);
        },
        onMistake: (input: string, ghostText: string, _droppedCount: number) => {
            inputController.setInput(input);
            inputController.updateGhostText(ghostText);
        },
        onComplete: (payload: { lesson: Lesson, stats: any }, originalCwd: string | null) => {
            const { lesson, stats } = payload;
            inputController.setInput(lesson.text);
            inputController.updateGhostText('');
            
            // Queue command for execution AFTER summary dismissal
            pendingCommandRef.current = lesson.text;
            inputController.clearInput();

            const isMission = lesson.isMission || (lesson.id && lesson.id.startsWith('MISSION_'));
            const hasSwitchedContext = !!stateRef.current.fsContext;
            if (originalCwd && !isMission && !hasSwitchedContext) {
                setTimeout(() => {
                    if (!stateRef.current.fsContext) {
                        setState(prev => ({ ...prev, currentDirectory: originalCwd }));
                        outputController.appendLine(
                            ShellPresenter.presentSystemMessage(`CONTEXT RESTORED: ${originalCwd}`)
                        );
                    }
                }, 1000);
            }
        }
    }), [inputController, outputController, gameManager]);

    const tutorController = useTutorController(
        gameManager.tutorEngine,
        tutorCallbacks,
        state.currentDirectory
    );

    // -- Shell Controller (Orchestration) --
    const shellController = useMemo(() => new ShellController({
        commandExecutor,
        gameManager,
        gameEventObserver: gameObserver,
        outputController,
        setState,
        stateRef,
        inputController,
        navigation,
        setIsTransitioning,
        setActiveApp,
        setMissions,
        simulationMediator
    }), [commandExecutor, gameManager, gameObserver, outputController, inputController, navigation, simulationMediator]);

    const handleCommand = useCallback((manualCommand?: string) => {
        const cmd = manualCommand !== undefined ? manualCommand : inputController.input;
        return shellController.execute(cmd);
    }, [shellController, inputController.input]);

    useEffect(() => {
        handleCommandRef.current = handleCommand;
    }, [handleCommand]);

    // -- Keyboard Input Logic (moved out of VM but kept here for now) --
    // Ideally this logic should exist in InputController or ShellController, 
    // but React event handling makes it cleaner to keep as a callback hook here.
    const handleKeyPress = useCallback((key: string) => {
        // 1. TUTOR SHADOW INTERCEPTION (GATING)
        const allowed = tutorShadow.intercept(key, 'SHELL');
        if (!allowed) return;

        // [FIX] Double Input: If tutor is active and accepted the key, 
        // the TutorCallbacks (onProgress) will update the input state.
        // We must NOT update it locally again.
        if (gameManager.tutorEngine.isActive()) {
            const lesson = gameManager.tutorEngine.getCurrentLesson();
            // Only skip local update if it's a character input that the tutor consumes
            if (lesson && lesson.type === 'SHELL' && key.length === 1) {
                return; 
            }
        }

        // 2. STANDARD SHELL LOGIC
        if (key === 'TAB') inputController.acceptAutocomplete();
        else if (key === 'ESC') inputController.clearInput();
        else if (key === 'BACKSPACE') inputController.deleteChar();
        else if (key === 'ENTER') handleCommand();
        else if (key.length === 1) inputController.appendChar(key);
    }, [inputController, handleCommand, tutorShadow, gameManager]);

    const handleVimExit = useCallback(() => {
        setIsTransitioning(true);
        setTimeout(() => {
            setActiveApp({ type: 'SHELL' });
            setTimeout(() => setIsTransitioning(false), 300);
        }, 100);
    }, []);

    return {
        // State
        state: TerminalStateMapper.toDTO(state),
        activeApp,
        isTransitioning,

        // Controllers / Hooks Expose
        input: inputController.input,
        ghostText: inputController.ghostText,
        outputLines: outputController.outputLines,
        renderedLineCount: outputController.renderedLineCount,
        markLineComplete: outputController.markLineComplete,
        tutorEmotion: tutorController.emotion,
        crashingIndices: tutorController.crashingIndices,

        // Actions
        handleInputChange: (text: string) => inputController.setInput(text),
        handleKeyPress,
        handleVimExit,
        toggleMinimize: outputController.toggleMinimize,
        deleteGroup: outputController.deleteGroup,

        // Exposed for composition if needed
        outputController,
        fsContext: state.fsContext
    };
};
