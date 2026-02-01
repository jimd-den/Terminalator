/**
 * ShellController - Interface Adapter Layer
 * 
 * " The Conductor "
 * 
 * Orchestrates the execution of user commands within the shell environment.
 * Receives input triggers from UI/Hooks, coordinates the `CommandExecutor`,
 * and dispatches updates to State, Output, and Navigation.
 * 
 * Pillar: The Four-Fold Shield (Separation of Concerns)
 * Pillar: The Storyteller's Code (Literate Documentation)
 * 
 * Notes:
 * This controller handles the "Process" of running a command:
 * 1. Echo Input
 * 2. Simulate Delay (Accessibility/Cinematic)
 * 3. Execute Logic
 * 4. Handle Result (Output, Control Flow, Transitions)
 */

import { MutableRefObject } from 'react';
import { ExecuteCommand } from '../../domain/usecases/ExecuteCommand';
import { TerminalState } from '../../domain/entities/TerminalState';
import { CommandResponse } from '../../domain/entities/Command';
import { TerminalOutputLine, OutputControllerActions } from './OutputController';
import { ShellPresenter } from '../presenters/ShellPresenter';
import { IGameManager } from '../../domain/interfaces/IGameManager';
import { GameEventObserver } from '../../domain/services/GameEventObserver';

export interface ShellControllerDeps {
    commandExecutor: ExecuteCommand;
    gameManager: IGameManager;
    gameEventObserver: GameEventObserver;
    outputController: OutputControllerActions;
    setState: (update: (prev: TerminalState) => TerminalState) => void;
    stateRef: MutableRefObject<TerminalState>;
    inputController: { clearInput: () => void };
    navigation: any; // Using any for navigation prop for now
    setIsTransitioning: (val: boolean) => void;
    setActiveApp: (app: any) => void;
    setMissions: (missions: any[]) => void;
}

export class ShellController {

    private deps: ShellControllerDeps;

    constructor(deps: ShellControllerDeps) {
        this.deps = deps;
    }

    /**
     * Executes a command string and manages the entire lifecycle of the operation.
     * 
     * @param cmdToRun - The command string to execute.
     */
    async execute(cmdToRun: string): Promise<void> {
        if (!cmdToRun) return;

        const {
            outputController,
            inputController,
            commandExecutor,
            stateRef,
            setState,
            gameManager,
            gameEventObserver,
            navigation,
            setIsTransitioning,
            setActiveApp,
            setMissions
        } = this.deps;

        // Phase 1: The Strike (Input Echo)
        // Echo the user's command to the screen immediately.
        const cmdIndex = outputController.getLineCount();
        outputController.appendLine(
            ShellPresenter.presentInputEcho(cmdToRun, true)
        );
        inputController.clearInput();

        // Phase 2: The Access (Cinematic Delay)
        // Simulate processing time for "feel". Can be 0 if desired.
        await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 300));

        // Phase 3: The Result (Execution)
        // Delegate actual logic to the Domain Layer (CommandExecutor)
        const response: CommandResponse = await commandExecutor.execute(cmdToRun, stateRef.current);
        const { output: cmdOutput, newState, navigationAction, uiAction, exitCode, controlFlow } = response;

        // Synchronous State Update pattern
        if (newState) {
            const updated = { ...stateRef.current, ...newState };
            stateRef.current = updated;
            setState(() => updated); // Functional update to ensure React consistency
        }

        // Handle Control Flow (e.g. EXIT)
        if (controlFlow === 'EXIT') {
            gameManager.tutorEngine.stop();
            outputController.clear();
            return;
        }

        // Handle UI Actions (e.g., CLEAR screen)
        if (uiAction === 'CLEAR') {
            outputController.clear();
            // Re-apply state if needed (though clear usually just wipes output)
            return;
        }

        // Handle Navigation (Screen Transitions)
        if (navigationAction?.type === 'NAVIGATE') {
            await this.handleNavigation(navigationAction, setIsTransitioning, setActiveApp, navigation);
            return;
        }

        // Update Input Status (Reveal OK/ERR visual indicator)
        outputController.updateInputStatus(cmdIndex, exitCode, false);

        // Phase 4: Materialization (Output Stream)
        // Use the Presenter to format the output string
        if (cmdOutput !== undefined && cmdOutput !== null) {
            outputController.appendLine(
                ShellPresenter.presentOutput(cmdOutput, response.metadata)
            );
        }

        const prevFsContext = stateRef.current.fsContext;

        // Notify GameManager (Tutor Analysis & Mission Triggers)
        // We pass the *effective* state which includes any updates from this command
        gameManager.onCommandExecuted(stateRef.current, response, prevFsContext);

        // Check for Procedural Events (Random NPC Messages)
        const eventMsg = gameEventObserver.checkProceduralEvents(outputController.getLineCount());
        if (eventMsg) {
            outputController.appendLine(
                ShellPresenter.presentSystemMessage(eventMsg)
            );
        }

        // Refresh Mission List (in case command affected missions)
        setMissions([...gameManager.getActiveMissions()]);
    }

    /**
     * Handles navigation side-effects.
     */
    private async handleNavigation(
        action: any,
        setIsTransitioning: (v: boolean) => void,
        setActiveApp: (app: any) => void,
        navigation: any
    ) {
        if (action.target === 'Editor') {
            setIsTransitioning(true);
            setTimeout(() => {
                setActiveApp({ type: 'VIM', filename: action.params.filename });
                setTimeout(() => setIsTransitioning(false), 300);
            }, 100);
            return;
        }
        navigation.navigate(action.target, action.params);
    }
}
