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
import { View, StyleSheet, ScrollView, Text, Pressable } from 'react-native';
import { THEME } from '../Theme';
import { GhostWriter } from '../GhostWriter';
import { VirtualKeyboard } from '../components/VirtualKeyboard';
import { ConsoleLayout } from '../components/ConsoleLayout';
import { useGame } from '../context/GameContext';
import { useVimEditor } from '../components/vim/VimEditor';
import { useInput } from '../context/InputContext';
import { useTerminalViewModel } from '../../../interface-adapters/viewmodels/TerminalViewModel';

import { useTheme } from '../context/ThemeContext';

export const TerminalScreen: React.FC = () => {
    const { fs, gameManager, commandExecutor } = useGame();
    const { theme, settings } = useTheme();
    const colors = theme.colors;

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

    const isShell = activeApp.type === 'SHELL';
    const vimFilename = activeApp.type === 'VIM' ? activeApp.filename : '';

    const vim = useVimEditor(vimFilename, handleVimExit);

    const status = isShell ? "OPERATIONAL" : `EDITING: ${vimFilename}`;

    const dynamicStyles = StyleSheet.create({
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
        inputWrapper: {
            width: '100%',
            flexDirection: 'column',
        },
        inputLabel: {
            color: colors.secondary,
            fontFamily: settings.fontFamily,
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
            color: colors.text.primary,
            fontFamily: settings.fontFamily,
            fontSize: THEME.typography.fontSize.lg,
            padding: 0,
            margin: 0,
            height: 35,
            lineHeight: 35,
            textAlignVertical: 'center',
            includeFontPadding: false,
        },
        ghostText: {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            color: colors.text.dim,
            zIndex: 0,
            height: 35,
            lineHeight: 35,
            textAlignVertical: 'center',
            includeFontPadding: false,
        },
        crtBlinkOverlay: {
            ...StyleSheet.absoluteFillObject,
            backgroundColor: colors.background,
            zIndex: 999,
        }
    });

    const topContent = isShell ? (
        <ScrollView
            contentContainerStyle={dynamicStyles.scrollContent}
            ref={(ref) => ref?.scrollToEnd({ animated: true })}
            keyboardShouldPersistTaps="always"
        >
            {outputLines.map((line, i) => (
                line.type === 'output' ? (
                    <GhostWriter
                        key={i}
                        text={line.text}
                        speed={10}
                        style={dynamicStyles.outputText}
                    />
                ) : (
                    <Text key={i} style={dynamicStyles.inputEchoText}>
                        {line.text}
                        {line.exitCode !== undefined && (
                            <Text style={{ color: line.exitCode === 0 ? colors.primary : colors.error }}>
                                {'  '}[STATUS {line.exitCode === 0 ? 'OK' : 'ERR'}: {line.exitCode}]
                            </Text>
                        )}
                    </Text>
                )
            ))}
        </ScrollView>
    ) : vim.topContent;

    const middleContent = isShell ? (
        <VirtualKeyboard onKeyPress={handleKeyPress} />
    ) : vim.middleContent;

    const { setOnInput, setOnKeyPress, refocus } = useInput();

    React.useEffect(() => {
        if (isShell) {
            setOnInput((text) => {
                for (const char of text) {
                    handleKeyPress(char);
                }
            });
            setOnKeyPress((key) => {
                handleKeyPress(key);
            });
        }
    }, [isShell, handleKeyPress, setOnInput, setOnKeyPress]);

    const bottomContent = (
        <View style={dynamicStyles.inputWrapper}>
            {!isShell ? (
                vim.bottomContent
            ) : (
                <>
                    <Text style={dynamicStyles.inputLabel}>
                        INPUT // {state.user}@system
                    </Text>
                    <Pressable style={dynamicStyles.inputContainer} onPress={refocus}>
                        <Text style={dynamicStyles.input}>
                            {input}
                            <View style={{ width: 10, height: 20, backgroundColor: colors.primary, transform: [{ translateY: 4 }] }} />
                            <Text style={{ color: colors.text.dim }}>{ghostText}</Text>
                        </Text>
                    </Pressable>
                </>
            )}
        </View>
    );

    return (
        <ConsoleLayout
            status={status}
            topContent={topContent}
            middleContent={middleContent}
            bottomContent={bottomContent}
        >
            {isTransitioning && <View style={dynamicStyles.crtBlinkOverlay} />}
        </ConsoleLayout>
    );
};
