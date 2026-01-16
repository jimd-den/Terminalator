/**
 * TerminalScreen - Presentation Layer
 * 
 * The core UI of the "Terminalator".
 * Features a high-contrast, two-box layout inspired by "Aliens" and Grid computers.
 * Follows Nintendo/Jack Dorsey principles: Large, intuitive, focused.
 *
 * Pillar: The Storyteller’s Code (Literate Documentation)
 * Pillar: The Balanced Scale (KISS)
 *
 * Intent:
 * Connects the user input to the domain logic (Command Executor).
 * Renders the system state (output lines, ghost text, CRT effects).
 */

import React from 'react';
import { View, StyleSheet, TextInput, ScrollView, Text } from 'react-native';
import { THEME } from '../../frameworks-drivers/ui/Theme';
import { GhostWriter } from '../../frameworks-drivers/ui/GhostWriter';
import { VirtualKeyboard } from '../components/VirtualKeyboard';
import { ConsoleLayout } from '../components/ConsoleLayout';
import { useGame } from '../context/GameContext';
import { useVimEditor } from '../components/vim/VimEditor';
import { useTerminalViewModel } from '../../interface-adapters/viewmodels/TerminalViewModel';

export const TerminalScreen: React.FC = () => {
    const { fs, gameManager, commandExecutor } = useGame();

    const {
        activeApp,
        state,
        input,
        outputLines,
        ghostText,
        isTransitioning,
        handleInputChange,
        handleKeyPress,
        handleCommand,
        handleVimExit
    } = useTerminalViewModel(fs, commandExecutor, gameManager);

    return (
        <>
            {activeApp.type === 'SHELL' ? (
                <ConsoleLayout
                    status="OPERATIONAL"
                    topContent={
                        <ScrollView
                            contentContainerStyle={styles.scrollContent}
                            ref={(ref) => ref?.scrollToEnd({ animated: true })}
                            keyboardShouldPersistTaps="handled"
                        >
                            {outputLines.map((line, i) => (
                                line.type === 'output' ? (
                                    <GhostWriter
                                        key={i}
                                        text={line.text}
                                        speed={10}
                                        style={styles.outputText}
                                    />
                                ) : (
                                    <Text key={i} style={styles.inputEchoText}>{line.text}</Text>
                                )
                            ))}
                        </ScrollView>
                    }
                    middleContent={<VirtualKeyboard onKeyPress={handleKeyPress} />}
                    bottomContent={
                        <View style={styles.inputWrapper}>
                            <Text style={styles.inputLabel}>
                                INPUT // {state.user}@system
                            </Text>
                            <View style={styles.inputContainer}>
                                <Text style={[styles.input, styles.ghostText]}>
                                    <Text style={{ opacity: 0 }}>{input}</Text>
                                    <Text style={{ opacity: 0.5 }}>{ghostText}</Text>
                                </Text>
                                <TextInput
                                    style={styles.input}
                                    value={input}
                                    onChangeText={handleInputChange}
                                    onSubmitEditing={handleCommand}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    autoFocus={true}
                                    cursorColor={THEME.colors.primary}
                                    placeholderTextColor={THEME.colors.text.dim}
                                    placeholder=""
                                />
                            </View>
                        </View>
                    }
                >
                    {isTransitioning && <View style={styles.crtBlinkOverlay} />}
                </ConsoleLayout>
            ) : (
                <VimContainer filename={activeApp.filename} onExit={handleVimExit} isTransitioning={isTransitioning} />
            )}
        </>
    );
};

// Wrapper component to isolate the Vim hook
const VimContainer: React.FC<{ filename: string; onExit: () => void; isTransitioning: boolean }> = ({ filename, onExit, isTransitioning }) => {
    const { topContent, middleContent, bottomContent } = useVimEditor(filename, onExit);

    return (
        <ConsoleLayout
            status={`EDITING: ${filename}`}
            topContent={topContent}
            middleContent={middleContent}
            bottomContent={bottomContent}
        >
            {isTransitioning && <View style={styles.crtBlinkOverlay} />}
        </ConsoleLayout>
    );
};

const styles = StyleSheet.create({
    scrollContent: {
        paddingBottom: THEME.spacing.xl,
    },
    outputText: {
        color: THEME.colors.text.primary,
        fontFamily: THEME.typography.fontFamily,
        fontSize: THEME.typography.fontSize.md,
        marginBottom: THEME.spacing.sm,
    },
    inputEchoText: {
        color: THEME.colors.secondary,
        fontFamily: THEME.typography.fontFamily,
        fontSize: THEME.typography.fontSize.md,
        marginBottom: THEME.spacing.xs,
        opacity: 0.7,
    },
    inputWrapper: {
        width: '100%',
        flexDirection: 'column',
    },
    inputLabel: {
        color: THEME.colors.secondary,
        fontFamily: THEME.typography.fontFamily,
        fontSize: THEME.typography.fontSize.sm,
        marginBottom: THEME.spacing.xs,
        opacity: 0.8,
        letterSpacing: 1,
    },
    inputContainer: {
        width: '100%',
        position: 'relative',
        justifyContent: 'center',
    },
    input: {
        width: '100%',
        color: THEME.colors.text.primary,
        fontFamily: THEME.typography.fontFamily,
        fontSize: THEME.typography.fontSize.lg,
        padding: 0,
        height: 30,
    },
    ghostText: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        color: THEME.colors.text.dim,
        zIndex: 0,
    },
    crtBlinkOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: THEME.colors.background,
        zIndex: 999,
    }
});
