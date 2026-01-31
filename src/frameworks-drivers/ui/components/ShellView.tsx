/**
 * ShellView - Presentation Layer
 *
 * The visual representation of TTY1: The System Shell.
 * Composes OutputContainer (Log) and InputBar (Prompt).
 *
 * Pillar: The Four-Fold Shield (Interface Adapter)
 * Pillar: The Balanced Scale (Composition)
 */

import React from 'react';
import { View } from 'react-native';
import { OutputContainer } from './OutputContainer';
import { InputBar } from './InputBar';
import { FKeyBar, FKeyDef } from './FKeyBar';
import { ContextHint } from './ContextHint';
import { TerminalOutputLine } from '../../../interface-adapters/controllers/OutputController';
import { TutorEmotion } from '../../../domain/entities/TutorEngine';

interface ShellViewProps {
    // State
    outputLines: any[];
    renderedLineCount: number;
    markLineComplete: () => void;
    input: string;
    ghostText: string;
    user: string;
    hostname: string;
    tutorEmotion: any;
    crashingIndices: number[];
    contextualHint: string | null;

    // Actions
    onRefocus: () => void;
    onKeyPress: (key: string) => void;
    onFKeyAction: (action: string) => void;
}

export const ShellView: React.FC<ShellViewProps> = ({
    outputLines,
    input,
    ghostText,
    user,
    hostname,
    tutorEmotion,
    crashingIndices,
    contextualHint,
    onRefocus,
    onKeyPress,
    onFKeyAction
}) => {
    return (
        // We return fragment/object structure to fit ConsoleLayout slots
        // This component is a bit unique as it provides props for slots rather than a single render tree
        // But for cleaner React, we will export components to be placed in slots by the parent
        // actually, let's keep it simple: render content, but maybe we need slot props?
        // Let's defer to the parent to split this into slots? 
        // No, let's make ShellView render the 'Top' and 'Bottom' content as accessible properties
        // or just render nothing and hold the sub-components?

        // Better pattern: ShellView is the "Screen Content" provider.
        // But ConsoleLayout expects separate top/middle/bottom props.
        // So we will just export a React Fragment? No.

        // Let's make ShellView return an object with slots, or
        // let TerminalScreen render <ShellView /> and ShellView uses a context?
        // Let's stick to the simplest refactor first:
        // ShellView will be a functional component that renders the full split layout?
        // Except ConsoleLayout is the outer frame.

        // Alternative: TerminalScreen renders:
        // topContent={<OutputContainer ... />}
        // bottomContent={<InputBar ... />}

        // So ShellView might just be a logical grouping helper? 
        // Actually, let's make ShellView a component that takes `layout: 'top' | 'middle' | 'bottom'` prop?
        // Or just export sub-components: ShellTop, ShellBottom?
        // No, let's try to make ShellView the full container around ConsoleLayout?
        // No, ConsoleLayout is generic for Vim/Shell.

        // Start simple: Just use OutputContainer and InputBar in TerminalScreen for now.
        // But the plan said `ShellView`.
        // Let's make `ShellView` a component that renders the specific Shell content *inside* a `ConsoleLayout` given to it?
        // OR `ShellView` wraps `ConsoleLayout`.

        // Let's make ShellView wrap ConsoleLayout since it defines the "Shell Experience".
        // But wait, VimEditor returns top/middle/bottom contents.
        // Let's match that pattern. Refactor later if needed.

        <></> // Placeholder, logic below
    );
};

// Returning a simple object to match vim hook pattern for now
export const useShellView = (props: ShellViewProps) => {
    // Define the hybrid key set
    const keys: FKeyDef[] = [
        { key: 'F1', label: 'HELP', action: () => props.onFKeyAction('HELP') },
        { key: 'F2', label: 'IRC', action: () => props.onFKeyAction('IRC') },
        { key: 'TAB', label: 'AUTO', action: () => props.onKeyPress('TAB') },
        { key: 'ESC', label: 'CLR', action: () => props.onKeyPress('ESC') },
        { key: '▲', label: 'UP', action: () => props.onKeyPress('UP') },
        { key: '▼', label: 'DOWN', action: () => props.onKeyPress('DOWN') },
        { key: '/', label: 'DIR', action: () => props.onKeyPress('/') },
        { key: 'ENT', label: 'EXEC', action: () => props.onKeyPress('ENTER') },
    ];

    return {
        topContent: (
            <OutputContainer
                lines={props.outputLines}
                renderedLineCount={props.renderedLineCount}
                onLineComplete={props.markLineComplete}
            />
        ),
        middleContent: <FKeyBar keys={keys} />,
        bottomContent: (
            <View>
                <ContextHint text={props.contextualHint} />
                <InputBar
                    input={props.input}
                    ghostText={props.ghostText}
                    user={props.user}
                    hostname={props.hostname}
                    tutorEmotion={props.tutorEmotion}
                    crashingIndices={props.crashingIndices}
                    onRefocus={props.onRefocus}
                />
            </View>
        )
    };
};
