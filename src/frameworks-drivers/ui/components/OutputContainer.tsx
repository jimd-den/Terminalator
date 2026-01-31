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
import { ScrollView, Text, StyleSheet, View, Pressable } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { THEME } from '../Theme';
import { GhostWriter } from '../GhostWriter';
import { TerminalOutputLine } from '../../../interface-adapters/controllers/OutputController';

interface OutputContainerProps {
    lines: TerminalOutputLine[];
    renderedLineCount: number;
    onLineComplete: () => void;
    onSave: (index: number) => void;
}

// Memoized blinking status component
const StatusIndicator = ({ exitCode, pending, colors, settings, onSave }: { exitCode?: number, pending?: boolean, colors: any, settings: any, onSave: () => void }) => {
    const [blinkCount, setBlinkCount] = React.useState(0);
    const [isSettled, setIsSettled] = React.useState(false);

    React.useEffect(() => {
        if (pending) {
            setIsSettled(false);
            const interval = setInterval(() => setBlinkCount(c => c + 1), 300);
            return () => clearInterval(interval);
        } else {
            // Settle after a brief materialization blink
            const timeout = setTimeout(() => setIsSettled(true), 1000);
            const interval = setInterval(() => setBlinkCount(c => c + 1), 150); // Faster blink on reveal
            return () => {
                clearTimeout(timeout);
                clearInterval(interval);
            };
        }
    }, [pending]);

    const visible = (blinkCount % 2 === 0) || isSettled;

    const indicatorStyles = StyleSheet.create({
        container: {
            flexDirection: 'row',
            alignItems: 'center',
            marginLeft: THEME.spacing.md,
        },
        status: {
            color: exitCode === 0 ? colors.primary : colors.error, // Red for errors, Green for OK
            fontFamily: settings.fontFamily,
            fontWeight: 'bold',
            opacity: visible ? 1 : 0.3
        },
        loadingText: {
            color: colors.primary,
            fontFamily: settings.fontFamily,
            fontSize: 10,
            opacity: visible ? 0.8 : 0.3,
            letterSpacing: 1,
        },
        saveBtn: {
            marginLeft: THEME.spacing.md,
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderWidth: 1,
            borderColor: colors.primary,
            opacity: 0.8,
        },
        saveText: {
            color: colors.primary,
            fontFamily: settings.fontFamily,
            fontSize: 10,
        }
    });

    if (pending) {
        return (
            <View style={indicatorStyles.container}>
                <Text style={indicatorStyles.loadingText}>[ ACCESSING DATA BANKS... ]</Text>
            </View>
        );
    }

    if (exitCode === undefined) return null;

    return (
        <View style={indicatorStyles.container}>
            <Text style={indicatorStyles.status}>
                [{exitCode === 0 ? 'STATUS OK' : 'SYSTEM ERR'}: {exitCode}]
            </Text>
            <React.Suspense fallback={null}>
                <Pressable
                    onPress={onSave}
                    style={({ pressed }) => [
                        indicatorStyles.saveBtn,
                        pressed && { backgroundColor: 'rgba(0, 255, 65, 0.2)' }
                    ]}
                >
                    <Text style={indicatorStyles.saveText}>SAVE</Text>
                </Pressable>
            </React.Suspense>
        </View>
    );
};

// Memoized line component to prevent re-rendering entire history
const OutputLineItem = React.memo(({ line, index, styles, colors, settings, onSave }: {
    line: TerminalOutputLine,
    index: number,
    styles: any,
    colors: any,
    settings: any,
    onSave: (idx: number) => void
}) => {
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
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.inputEchoText}>
                {line.text}
            </Text>
            {line.exitCode !== undefined && (
                <StatusIndicator
                    exitCode={line.exitCode}
                    colors={colors}
                    settings={settings}
                    onSave={() => onSave(index)}
                />
            )}
        </View>
    );
});

export const OutputContainer: React.FC<OutputContainerProps> = ({
    lines,
    renderedLineCount,
    onLineComplete,
    onSave
}) => {
    const { theme, settings } = useTheme();
    const colors = theme.colors;
    const scrollViewRef = React.useRef<ScrollView>(null);

    /**
     * Generator for Phosphorus Aesthetics.
     * Pure function to create themed styles with glow effects.
     */
    const createPhosphorStyles = (colors: any, settings: any) => StyleSheet.create({
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
            opacity: 0.8,
        },
        systemText: {
            color: colors.primary,
            fontFamily: settings.fontFamily,
            fontSize: THEME.typography.fontSize.md,
            marginBottom: THEME.spacing.sm,
            fontWeight: 'bold',
        },
        fishLsContainer: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 16,
            marginBottom: THEME.spacing.sm,
        },
        dirText: {
            color: colors.primary,
            fontWeight: 'bold',
            fontFamily: settings.fontFamily,
            fontSize: THEME.typography.fontSize.md,
        },
        fileText: {
            color: 'rgba(0, 255, 65, 0.7)',
            fontFamily: settings.fontFamily,
            fontSize: THEME.typography.fontSize.md,
        },
    });

    const styles = React.useMemo(() => createPhosphorStyles(colors, settings), [colors, settings]);

    // Internal helper to render mixed types of output
    const renderLine = (line: TerminalOutputLine, index: number) => {
        const isTyped = index < renderedLineCount;
        const isTyping = index === renderedLineCount;

        // If it's a future line, don't render yet
        if (index > renderedLineCount) return null;

        if (line.type === 'output' || line.type === 'system') {
            // -- Specialized Pretty Printing (Fish-style) --
            if (line.type === 'output' && line.metadata?.renderType === 'fish-style') {
                const items: { name: string, type: string }[] = line.metadata.data?.items || [];

                if (isTyped) {
                    return (
                        <View key={index} style={styles.fishLsContainer}>
                            {items.map((item, i) => (
                                <Text key={i} style={item.type === 'dir' ? styles.dirText : styles.fileText}>
                                    {item.name}
                                </Text>
                            ))}
                        </View>
                    );
                }

                return (
                    <View key={index} style={styles.fishLsContainer}>
                        {items.map((item, i) => (
                            <GhostWriter
                                key={i}
                                text={item.name}
                                speed={10}
                                style={item.type === 'dir' ? styles.dirText : styles.fileText}
                                isActive={isTyping}
                                onComplete={i === items.length - 1 ? onLineComplete : undefined}
                            />
                        ))}
                        {items.length === 0 && (
                            <Text style={styles.outputText}> </Text>
                        )}
                    </View>
                );
            }

            // -- Standard Output Rendering --
            if (isTyped) {
                return (
                    <Text key={index} style={line.type === 'system' ? styles.systemText : styles.outputText}>
                        {line.text || ' '}
                    </Text>
                );
            }

            // Current line gets the GhostWriter for 'materializing' effect
            return (
                <GhostWriter
                    key={index}
                    text={line.text}
                    speed={15}
                    style={line.type === 'system' ? styles.systemText : styles.outputText}
                    isActive={isTyping}
                    onComplete={onLineComplete}
                />
            );
        }

        // Input echoes (instant)
        if (!isTyped && !isTyping) return null;

        if (isTyping) {
            setTimeout(onLineComplete, 0);
        }

        return (
            <OutputLineItem
                key={index}
                index={index}
                line={line}
                styles={styles}
                colors={colors}
                settings={settings}
                onSave={onSave}
            />
        );
    };

    return (
        <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.scrollContent}
            ref={scrollViewRef}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            keyboardShouldPersistTaps="always"
        >
            {lines.map((line, i) => renderLine(line, i))}
        </ScrollView>
    );
};
