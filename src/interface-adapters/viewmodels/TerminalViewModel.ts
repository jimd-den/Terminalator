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
import { ExecuteCommand } from '../../domain/usecases/ExecuteCommand';
import { GameManager } from '../GameManager';

// Import Headless ViewModel
import { useHeadlessTerminal } from './useHeadlessTerminal';

export { ActiveView } from './useHeadlessTerminal';
export { TerminalOutputLine } from '../controllers/OutputController';

export const useTerminalViewModel = (
    fs: FileSystem,
    commandExecutor: ExecuteCommand,
    gameManager: GameManager
) => {
    // All terminal logic and state is now managed by the headless hook.
    // This allows the UI to be swapped or themed without changing the core orchestration.
    return useHeadlessTerminal(fs, commandExecutor, gameManager);
};
