/**
 * useHeadlessVim - Interface Adapter Layer
 *
 * A "Headless" ViewModel for the Vim Editor.
 * Decouples the editor logic from the React Native view.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Universal Interface (Headless Pattern)
 */

import { useState, useMemo, useEffect } from 'react';
import { VimSimulator } from '../../interface-adapters/VimSimulator';
import { HighlighterRegistry } from '../../interface-adapters/vim/HighlighterRegistry';
import { useVimInputController } from '../../interface-adapters/controllers/VimInputController';
import { useVimTutorController } from '../../interface-adapters/controllers/VimTutorController';
import { TutorEngine } from '../../domain/entities/TutorEngine';
import { TutorShadow } from '../../domain/services/tutor/TutorShadow';
import { SyntaxHighlighter } from '../../domain/ports/SyntaxHighlighter';
import { VimState } from '../../domain/entities/VimEngine';
import { FileSystemService } from '../../domain/services/FileSystemService';

export interface HeadlessVimState {
    // Editor Core State
    lines: string[];
    cursor: { line: number, col: number };
    mode: VimState['mode'];
    statusMessage: string | null;
    lintErrors: VimState['lintErrors'];

    // Command Mode
    commandInput: string;

    // Tutor Overlay
    tutor: {
        active: boolean;
        text: string;
        completed: string;
    };

    // Syntax Highlighting Strategy
    highlighter: SyntaxHighlighter;

    // Actions
    handleVirtualKey: (key: string) => void;
}

const highlighterRegistry = new HighlighterRegistry();

export const useHeadlessVim = (
    filename: string,
    fsService: FileSystemService,
    tutorEngine: TutorEngine,
    tutorShadow: TutorShadow,
    onExit: () => void
): HeadlessVimState => {
    
    // -- Simulator (Domain Orchestrator) --
    const simulator = useMemo(() => new VimSimulator(fsService, filename), [filename, fsService]);
    const highlighter = useMemo(() => highlighterRegistry.getHighlighterForFile(filename), [filename]);

    // -- Controllers --
    const inputController = useVimInputController(simulator, onExit, tutorEngine, tutorShadow);
    const tutorState = useVimTutorController(tutorEngine);

    // -- Map Internal State to Public Interface --
    return {
        lines: inputController.state.lines,
        cursor: inputController.state.cursor,
        mode: inputController.state.mode,
        statusMessage: inputController.state.statusMessage,
        lintErrors: inputController.state.lintErrors,
        
        commandInput: inputController.commandInput,
        
        tutor: tutorState,
        
        highlighter,
        
        handleVirtualKey: inputController.handleVirtualKey
    };
};
