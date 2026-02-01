/**
 * VimScreen - Presentation Layer (UI)
 *
 * Manages the Vim Editor Experience.
 * Wraps the VimEditor hook and renders the layout.
 *
 * Pillar: The Four-Fold Shield (SRP Separation)
 * Pillar: The Balanced Scale (Composition)
 */

import React from 'react';
import { ConsoleLayout } from '../components/ConsoleLayout';
import { useVimEditor } from '../components/vim/VimEditor';

export interface VimScreenProps {
    filename: string;
    onExit: () => void;
}

export const VimScreen: React.FC<VimScreenProps> = ({ filename, onExit }) => {
    // -- Vim Logic --
    // The `useVimEditor` hook encapsulates the complex editor state,
    // input handling, and syntax highlighting.
    const vim = useVimEditor(filename, onExit);

    return (
        <ConsoleLayout
            status={`EDITING: ${filename}`}
            topContent={vim.topContent}
            middleContent={vim.middleContent}
            bottomContent={vim.bottomContent}
        />
    );
};
