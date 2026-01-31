/**
 * OutputContainer - Presentation Layer
 *
 * Renders the scrolling log of terminal output.
 * Uses memoization to ensure performance with large history.
 *
 * Pillar: The Swift Stream (Performance)
 * Pillar: The Balanced Scale (SRP)
 */

import React from 'react';
import { ScrollView, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { THEME } from '../Theme';
import { GhostWriter } from '../GhostWriter';
import { TerminalOutputLine } from '../../../interface-adapters/controllers/OutputController';

interface OutputContainerProps {
    lines: TerminalOutputLine[];
    renderedLineCount: number;
    onLineComplete: () => void;
}

// Memoized line component to prevent re-rendering entire history
const OutputLineItem = React.memo(({ line, styles, colors }: { line: TerminalOutputLine, styles: any, colors: any }) => {
    if (line.type === 'output') {
        return (
            <GhostWriter
                text={line.text}
                speed={10}
                style={styles.outputText}
            />
        );
    }
    return (
        <Text style={styles.inputEchoText}>
            {line.text}
            {line.exitCode !== undefined && (
                <Text style={{ color: line.exitCode === 0 ? colors.primary : colors.error }}>
                    {'  '}[STATUS {line.exitCode === 0 ? 'OK' : 'ERR'}: {line.exitCode}]
                </Text>
            )}
        </Text>
    );
});

export const OutputContainer: React.FC<OutputContainerProps> = ({
    lines,
    renderedLineCount,
    onLineComplete
}) => {
    const { theme, settings } = useTheme();
    const colors = theme.colors;
    const scrollViewRef = React.useRef<ScrollView>(null);

    const styles = StyleSheet.create({
        scrollContent: {
            paddingBottom: THEME.spacing.xl,
        },
        outputText: {
            color: colors.text.primary,
            fontFamily: settings.fontFamily,
            fontSize: THEME.typography.fontSize.md,
            marginBottom: THEME.spacing.sm,
        },
        inputEchoText: {
            color: colors.secondary,
            fontFamily: settings.fontFamily,
            fontSize: THEME.typography.fontSize.md,
            marginBottom: THEME.spacing.xs,
            opacity: 0.7,
        },
        systemText: {
            color: colors.text.dim, // Or primary? Let's go with dim for system logs
            fontFamily: settings.fontFamily,
            fontSize: THEME.typography.fontSize.md,
            marginBottom: THEME.spacing.sm,
            fontWeight: 'bold',
        },
    });

    // FIX: Use external rendered count directly
    const renderLine = (line: TerminalOutputLine, index: number) => {
        const isTyped = index < renderedLineCount;
        const isTyping = index === renderedLineCount;

        // If it's a future line, don't render yet
        if (index > renderedLineCount) return null;

        if (line.type === 'output' || line.type === 'system') {
            // Past lines should be static TEXT for performance.
            if (isTyped) {
                return (
                    <Text key={index} style={line.type === 'system' ? styles.systemText : styles.outputText}>
                        {line.text}
                    </Text>
                );
            }

            // Current line gets the GhostWriter
            return (
                <GhostWriter
                    key={index}
                    text={line.text}
                    speed={20} // Slower base speed
                    style={line.type === 'system' ? styles.systemText : styles.outputText}
                    isActive={isTyping}
                    onComplete={onLineComplete}
                />
            );
        }

        // Input lines logic
        if (!isTyped && !isTyping) return null;

        // We do NOT simulate typing for input echoes, they are instant.
        // But we must mark them complete immediately to advance the queue.
        if (isTyping) {
            // Use timeout to avoid render-cycle updates
            setTimeout(onLineComplete, 0);
        }

        return (
            <OutputLineItem
                key={index}
                line={line}
                styles={styles}
                colors={colors}
            />
        );
    };

    return (
        <ScrollView
            contentContainerStyle={styles.scrollContent}
            ref={scrollViewRef}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            keyboardShouldPersistTaps="always"
        >
            {lines.map((line, i) => renderLine(line, i))}
        </ScrollView>
    );
};
