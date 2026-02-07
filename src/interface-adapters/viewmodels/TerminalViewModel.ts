/**
 * TerminalViewModel - Interface Adapter Layer
 *
 * " The Humble Composition Root "
 *
 * Manages the high-level orchestration of the Terminal Screen.
 * Composes the Headless Terminal ViewModel to drive the UI.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Balanced Scale (Composition > Inheritance)
 */

import { FileSystem } from '../../domain/entities/FileSystem';
import { IShellExecutor } from '../../domain/interfaces/IShellExecutor';
import { GameManager } from '../GameManager';
import { TutorShadow } from '../../domain/services/tutor/TutorShadow';

// Import Headless ViewModel
import { useHeadlessTerminal } from './useHeadlessTerminal';

export { ActiveView } from './useHeadlessTerminal';
export { TerminalOutputLine } from '../controllers/OutputController';

export const useTerminalViewModel = (
    fs: FileSystem,
    commandExecutor: IShellExecutor,
    gameManager: GameManager,
    tutorShadow: TutorShadow
) => {
    // All terminal logic and state is now managed by the headless hook.
    // This allows the UI to be swapped or themed without changing the core orchestration.
    return useHeadlessTerminal(fs, commandExecutor as any, gameManager, tutorShadow);
};
