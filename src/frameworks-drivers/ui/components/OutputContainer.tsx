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
    onMinimize: (index: number) => void;
    onDelete: (index: number) => void;
}

// Memoized blinking status component
const StatusIndicator = ({
    exitCode,
    pending,
    colors,
    settings,
    onSave,
    onMinimize,
    onDelete,
    isMinimized
}: {
    exitCode?: number,
    pending?: boolean,
    colors: any,
    settings: any,
    onSave: () => void,
    onMinimize: () => void,
    onDelete: () => void,
    isMinimized?: boolean
}) => {
    const { components } = useTheme();
    const { TextRenderer } = components;
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
    const smiley = blinkCount % 4 === 0 ? '( ^_^)' : '( o_o)';

    const indicatorStyles = StyleSheet.create({
        container: {
            flexDirection: 'row',
            alignItems: 'center',
            marginLeft: THEME.spacing.md,
        },
        status: {
            fontWeight: 'bold',
            opacity: visible ? 1 : 0.3,
            fontSize: 12,
        },
        loadingText: {
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
            fontSize: 10,
        },
        deleteBtn: {
            marginLeft: THEME.spacing.sm,
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderWidth: 1,
            borderColor: colors.error,
            opacity: 0.8,
        },
        deleteText: {
            fontSize: 10,
        }
    });

    if (pending) {
        return (
            <View style={indicatorStyles.container}>
                <TextRenderer 
                    style={indicatorStyles.loadingText} 
                    content="[ ACCESSING DATA BANKS... ]" 
                />
            </View>
        );
    }

    if (exitCode === undefined) return null;

    return (
        <View style={indicatorStyles.container}>
            <TextRenderer 
                style={indicatorStyles.status}
                type={exitCode === 0 ? 'primary' : 'error'}
                content={`${exitCode === 0 ? `${smiley} STATUS OK` : `SYSTEM ERR`}: ${exitCode}`}
            />
            <React.Suspense fallback={null}>
                <Pressable
                    onPress={onSave}
                    style={({ pressed }) => [
                        indicatorStyles.saveBtn,
                        pressed && { backgroundColor: 'rgba(0, 255, 65, 0.2)' }
                    ]}
                >
                    <TextRenderer style={indicatorStyles.saveText} content="SAVE" />
                </Pressable>
                <Pressable
                    onPress={onMinimize}
                    style={({ pressed }) => [
                        indicatorStyles.saveBtn,
                        pressed && { backgroundColor: 'rgba(0, 255, 65, 0.2)' }
                    ]}
                >
                    <TextRenderer style={indicatorStyles.saveText} content={isMinimized ? 'MAX' : 'MIN'} />
                </Pressable>
                <Pressable
                    onPress={onDelete}
                    style={({ pressed }) => [
                        indicatorStyles.deleteBtn,
                        pressed && { backgroundColor: 'rgba(255, 0, 0, 0.2)' }
                    ]}
                >
                    <TextRenderer type="error" style={indicatorStyles.deleteText} content="DEL" />
                </Pressable>
            </React.Suspense>
        </View>
    );
};

/**
 * SequentialCommandEcho - Handles the 3-stage materialization of a command line.
 * Stage 1: COMMAND: [cmd] (Typed)
 * Stage 2: ...... (Dots Typed)
 * Stage 3: STATUS / CONTROLS (Revealed)
 */
const SequentialCommandEcho = ({
    line, index, styles, colors, settings, onSave, onMinimize, onDelete, onComplete, isActive, isTyped
}: {
    line: TerminalOutputLine,
    index: number,
    styles: any,
    colors: any,
    settings: any,
    onSave: (idx: number) => void,
    onMinimize: (idx: number) => void,
    onDelete: (idx: number) => void,
    onComplete: () => void,
    isActive: boolean,
    isTyped: boolean
}) => {
    const { components } = useTheme();
    const { TextRenderer } = components;
    const [stage, setStage] = React.useState<'text' | 'dots' | 'final'>(isTyped ? 'final' : 'text');
    const cleanText = line.text.replace(/^>\s*/, '');
    const baseText = `COMMAND: ${cleanText}`;
    const dotsText = ' . . . . . .';

    React.useEffect(() => {
        if (isTyped) setStage('final');
    }, [isTyped]);

    if (!isActive && !isTyped) return null;

    return (
        <View style={styles.inputLineContainer}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                {stage === 'text' && isActive ? (
                    <GhostWriter
                        text={baseText}
                        speed={20}
                        style={styles.inputEchoText}
                        isActive={true}
                        onComplete={() => setStage('dots')}
                    />
                ) : (
                    <TextRenderer type="secondary" style={styles.inputEchoText} content={baseText} />
                )}

                {stage === 'dots' && isActive ? (
                    <GhostWriter
                        text={dotsText}
                        speed={120} // Even crunchier, more deliberate dots for mainframe feel
                        style={styles.inputEchoText}
                        isActive={true}
                        onComplete={() => {
                            setStage('final');
                            onComplete();
                        }}
                    />
                ) : (stage !== 'text') ? (
                    <TextRenderer type="secondary" style={styles.inputEchoText} content={dotsText} />
                ) : null}
            </View>

            {stage === 'final' && (
                <StatusIndicator
                    exitCode={line.exitCode}
                    pending={line.pending}
                    colors={colors}
                    settings={settings}
                    onSave={() => onSave(index)}
                    onMinimize={() => onMinimize(index)}
                    onDelete={() => onDelete(index)}
                    isMinimized={line.isMinimized}
                />
            )}
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
    return null;
});

export const OutputContainer: React.FC<OutputContainerProps> = ({
    lines,
    renderedLineCount,
    onLineComplete,
    onSave,
    onMinimize,
    onDelete
}) => {
    const { theme, settings, components } = useTheme();
    const { TextRenderer } = components;
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
            marginBottom: THEME.spacing.sm,
        },
        inputEchoText: {
            color: colors.secondary,
            fontFamily: settings.fontFamily,
            fontSize: THEME.typography.fontSize.md,
            fontWeight: 'bold',
            textAlign: 'left', // [INDUSTRIAL] Left-aligned command
        },
        inputLineContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between', // [PUSH-PULL] Text left, Controls right
            marginBottom: THEME.spacing.xs,
            width: '100%',
        },
        systemText: {
            marginBottom: THEME.spacing.sm,
            fontWeight: 'bold',
        },
        fishLsContainer: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 12,
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
        cardContainer: {
            borderWidth: 1,
            borderColor: colors.primary,
            marginBottom: THEME.spacing.md,
            marginTop: THEME.spacing.xs,
        },
        cardHeader: {
            backgroundColor: colors.primary,
            paddingHorizontal: THEME.spacing.sm,
            paddingVertical: 2,
        },
        cardHeaderText: {
            color: colors.background,
            fontFamily: settings.fontFamily,
            fontSize: 10,
            fontWeight: 'bold',
            letterSpacing: 1,
        },
        cardBody: {
            padding: THEME.spacing.md,
            backgroundColor: 'rgba(0, 255, 65, 0.05)',
        },
    });

    const styles = React.useMemo(() => createPhosphorStyles(colors, settings), [colors, settings]);

    // Internal helper to render mixed types of output
    const renderLine = (line: TerminalOutputLine, index: number) => {
        const isTyped = index < renderedLineCount;
        const isTyping = index === renderedLineCount;

        // If it's a future line, don't render yet
        if (index > renderedLineCount) return null;

        // Skip deleted lines
        if (line.isDeleted) return null;

        // Determine if this line belongs to a minimized group
        if (line.type !== 'input') {
            // Find the most recent input line before this one
            for (let i = index - 1; i >= 0; i--) {
                if (lines[i].type === 'input') {
                    if (lines[i].isMinimized) return null;
                    break;
                }
            }
        }

        if (line.type === 'input') {
            return (
                <SequentialCommandEcho
                    key={index}
                    line={line}
                    index={index}
                    styles={styles}
                    colors={colors}
                    settings={settings}
                    onSave={onSave}
                    onMinimize={onMinimize}
                    onDelete={onDelete}
                    onComplete={onLineComplete}
                    isActive={isTyping}
                    isTyped={isTyped}
                />
            );
        }

        if (line.type === 'output' || line.type === 'system') {
            // -- Specialized Pretty Printing (Fish-style) --
            if (line.type === 'output' && line.metadata?.renderType === 'fish-style') {
                const items: { name: string, type: string }[] = line.metadata.data?.items || [];

                const renderItems = (isStatic: boolean) => (
                    <View style={styles.cardContainer}>
                        <View style={styles.cardHeader}>
                            <TextRenderer style={styles.cardHeaderText} content="[ DATA_NODES_STREAM ]" />
                        </View>
                        <View style={styles.cardBody}>
                            <View style={styles.fishLsContainer}>
                                {items.map((item, i) => {
                                    const symbol = item.type === 'dir' ? '◆' : '◻';
                                    const label = `${symbol} ${item.name}`;

                                    if (isStatic) {
                                        return (
                                            <TextRenderer 
                                                key={i} 
                                                content={label}
                                                type={item.type === 'dir' ? 'primary' : 'secondary'}
                                                style={{ fontWeight: item.type === 'dir' ? 'bold' : 'normal' }}
                                            />
                                        );
                                    }

                                    return (
                                        <GhostWriter
                                            key={i}
                                            text={label}
                                            speed={10}
                                            style={item.type === 'dir' ? styles.dirText : styles.fileText}
                                            isActive={isTyping}
                                            onComplete={i === items.length - 1 ? onLineComplete : undefined}
                                        />
                                    );
                                })}
                                {items.length === 0 && (
                                    <TextRenderer content="[ NO_DATA_DETECTED ]" type="dim" />
                                )}
                            </View>
                        </View>
                    </View>
                );

                return (
                    <View key={index}>
                        {renderItems(isTyped)}
                    </View>
                );
            }

            // -- Standard Output Rendering --
            if (isTyped) {
                return (
                    <TextRenderer 
                        key={index} 
                        type={line.type === 'system' ? 'primary' : 'primary'}
                        style={line.type === 'system' ? styles.systemText : styles.outputText}
                        content={line.text || ' '}
                    />
                );
            }

            // Current line gets the GhostWriter for 'materializing' effect
            return (
                <GhostWriter
                    key={index}
                    text={line.text}
                    speed={10} // Fast data stream materialization
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
