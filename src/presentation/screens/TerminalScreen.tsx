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

import React, { useState } from 'react';
import { View, StyleSheet, TextInput, ScrollView, Text } from 'react-native';
import { THEME } from '../../frameworks-drivers/ui/Theme';
import { GhostWriter } from '../../frameworks-drivers/ui/GhostWriter';
import { createInitialTerminalState } from '../../domain/entities/TerminalState';
import { VirtualKeyboard } from '../components/VirtualKeyboard';
import { ConsoleLayout } from '../components/ConsoleLayout';
import { useGame } from '../context/GameContext';
import { useNavigation } from '@react-navigation/native';
import { useVimEditor } from '../components/vim/VimEditor';

type ActiveApp = { type: 'SHELL' } | { type: 'VIM', filename: string };

export const TerminalScreen: React.FC = () => {
    const { fs, gameManager, commandExecutor } = useGame();
    const navigation = useNavigation();

    // App State: Manages whether we are in the Shell or a sub-application like Vim
    const [activeApp, setActiveApp] = useState<ActiveApp>({ type: 'SHELL' });

    // Terminal State: Manages the shell environment and visual output
    const [state, setState] = useState(createInitialTerminalState());
    const [input, setInput] = useState('');
    const [outputLines, setOutputLines] = useState<{ text: string, type: 'input' | 'output' }[]>([
        { text: 'SYSTEM INITIALIZED... BOOT SEQUENCE READY', type: 'output' },
        { text: 'WELCOME TO MAINFRAME v1.0', type: 'output' },
        { text: 'TYPE "mail" TO CHECK TRANSMISSIONS', type: 'output' },
    ]);

    const [ghostText, setGhostText] = useState('');
    const [isTransitioning, setIsTransitioning] = useState(false);

    // Autocomplete Logic
    const suggestions = ['help', 'ls', 'cd', 'cat', 'whoami', 'mail', 'check-comms', 'clear', 'vim', 'man', 'grep'];

    const getAutocompleteSuggestion = (inputText: string): string => {
        if (!inputText) return '';
        const parts = inputText.split(' ');
        const cmd = parts[0];

        // 1. Command Autocomplete
        if (parts.length === 1) {
            const match = suggestions.find(s => s.startsWith(inputText.toLowerCase()) && s !== inputText.toLowerCase());
            return match ? match.substring(inputText.length) : '';
        }

        // 2. File Autocomplete
        let lookingForFile = false;
        let partialName = '';

        if (['cd', 'cat', 'vim', 'ls'].includes(cmd) && parts.length === 2) {
            lookingForFile = true;
            partialName = parts[1];
        } else if (cmd === 'grep' && parts.length === 3) {
            lookingForFile = true;
            partialName = parts[2];
        }

        if (lookingForFile) {
            // Simplified relative path resolution for UI responsiveness
            // In a real shell, we would use the Command Executor's resolution logic
            const targetDir = state.currentDirectory;
            const node = fs.getNode(targetDir);

            if (node && node.children) {
                const files = Object.keys(node.children);
                const match = files.find(f => f.startsWith(partialName) && f !== partialName);
                return match ? match.substring(partialName.length) : '';
            }
        }
        return '';
    };

    const handleInputChange = (text: string) => {
        setInput(text);
        setGhostText(getAutocompleteSuggestion(text));
    };

    const handleKeyPress = (key: string) => {
        if (key === 'TAB') {
            if (ghostText) {
                const fullCommand = input + ghostText;
                setInput(fullCommand);
                setGhostText('');
            }
        } else if (key === 'ESC') {
            setInput('');
            setGhostText('');
        } else {
            setInput(prev => {
                const next = prev + key;
                setGhostText(getAutocompleteSuggestion(next));
                return next;
            });
        }
    };

    const handleCommand = () => {
        const cmdToRun = input;
        if (!cmdToRun) return;

        // Execute via Domain Logic
        const response = commandExecutor.execute(input, state);
        const { output: cmdOutput, newState, navigationAction, uiAction } = response;

        // Handle UI Actions
        if (uiAction === 'CLEAR') {
            setOutputLines([]);
            setState(newState);
            setInput('');
            setGhostText('');
            return;
        }

        // Handle Navigation
        if (navigationAction && navigationAction.type === 'NAVIGATE') {
            if (navigationAction.target === 'Editor') {
                setIsTransitioning(true);
                setTimeout(() => {
                    setActiveApp({ type: 'VIM', filename: navigationAction.params.filename });
                    setTimeout(() => setIsTransitioning(false), 300);
                }, 100);
                return;
            }
            (navigation.navigate as any)(navigationAction.target, navigationAction.params);
            return;
        }

        // Update Shell Output
        setOutputLines(prev => [
            ...prev,
            { text: `> ${input}`, type: 'input' },
            { text: cmdOutput, type: 'output' }
        ]);
        setState(newState);
        setInput('');
        setGhostText('');

        // Simulate random procedural events
        if (outputLines.length > 5 && outputLines.length % 4 === 0) {
            const mail = gameManager.spawnNPCEvent();
            setOutputLines(prev => [...prev, { text: `[ NEW TRANSMISSION: ID ${mail.id} FROM ${mail.from} ]`, type: 'output' }]);
        }
    };

    const handleVimExit = () => {
        setIsTransitioning(true);
        setTimeout(() => {
            setActiveApp({ type: 'SHELL' });
            setTimeout(() => setIsTransitioning(false), 300);
        }, 100);
    };

    return (
        <>
            {activeApp.type === 'SHELL' ? (
                <ConsoleLayout
                    status="OPERATIONAL"
                    topContent={
                        <ScrollView
                            contentContainerStyle={styles.scrollContent}
                            ref={(ref) => ref?.scrollToEnd({ animated: true })}
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
