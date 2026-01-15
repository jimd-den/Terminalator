/**
 * TerminalScreen - Presentation Layer
 * 
 * The core UI of the "Terminalator".
 * Features a high-contrast, two-box layout inspired by "Aliens" and Grid computers.
 * Follows Nintendo/Jack Dorsey principles: Large, intuitive, focused.
 */

import React, { useState } from 'react';
import { View, StyleSheet, TextInput, ScrollView, Text, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { THEME } from '../../frameworks-drivers/ui/Theme';
import { GhostWriter } from '../../frameworks-drivers/ui/GhostWriter';
import { FileSystem } from '../../domain/entities/FileSystem';
import { createInitialTerminalState } from '../../domain/entities/TerminalState';
import { GameCommandExecutor } from '../../interface-adapters/GameCommandExecutor';
import { GameManager } from '../../interface-adapters/GameManager';
import { VirtualKeyboard } from '../components/VirtualKeyboard';
import { ConsoleLayout } from '../components/ConsoleLayout';
import { useGame } from '../context/GameContext';
import { useNavigation } from '@react-navigation/native';
import { useVimEditor } from '../components/vim/VimEditor';

type ActiveApp = { type: 'SHELL' } | { type: 'VIM', filename: string };

export const TerminalScreen: React.FC = () => {
    const { fs, gameManager, commandExecutor } = useGame();
    // Navigation still needed? Maybe for other features, but not for Vim anymore.
    const navigation = useNavigation();

    // App State
    const [activeApp, setActiveApp] = useState<ActiveApp>({ type: 'SHELL' });

    // Vim Hook
    // We conditionally use the hook? No, hooks must be unconditional.
    // We can pass a dummy filename if not active? 
    // Or we render a child component that uses the hook.
    // Let's render the hook usage in a wrapper or just use null if not active.
    // Actually, creating a sub-component for the Vim part is cleaner to avoid Hook rules issues with conditional rendering logic if we were to unmount it.
    // But since we want to keep state, we should probably mount/unmount the Vim subsystem.

    // Let's use a sub-component <VimContainer /> that takes filename.
    // But we defined useVimEditor as a hook returning UI.
    // So we need a component that calls this hook.

    const [state, setState] = useState(createInitialTerminalState());
    const [input, setInput] = useState('');
    const [outputLines, setOutputLines] = useState<{ text: string, type: 'input' | 'output' }[]>([
        { text: 'SYSTEM INITIALIZED... BOOT SEQUENCE READY', type: 'output' },
        { text: 'WELCOME TO MAINFRAME v1.0', type: 'output' },
        { text: 'TYPE "mail" TO CHECK TRANSMISSIONS', type: 'output' },
    ]);

    const [ghostText, setGhostText] = useState('');
    const [isTransitioning, setIsTransitioning] = useState(false);

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
        // Helper to check if we are in a position to autocomplete a file
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
            // Get files in current directory
            // We need to access the FS from the hook, so we assume fs is available in scope.
            // NOTE: currentDirectory logic from ExecuteCommand does relative path resolution.
            // For autocomplete, we will simplify to "files in current WD".
            // Complex path completion (e.g. cd ../bin) is ommitted for simplicity as per requirement "context aware" usually implies "files available here".

            // To be robust, we should match resolving logic, but we'll stick to listing current directory children.
            let targetDir = state.currentDirectory;
            // If the partial name actually looks like a path (starts with /), we might want to resolve it, 
            // but let's stick to simple filename completion for now to satisfy "path autocompletion" in the common case.

            // However, ExecuteCommand resolves currentDirectory relative to root if it doesnt start with /.
            // In TerminalState, currentDirectory is likely absolute (e.g. /home/operator).

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
                setGhostText(''); // Clear ghost text after accepting, or re-calculate?
                // Re-calculation happens on next render or we can verify if more completion is available
                // Usually we just append. If we appended a dir, maybe we want to continue? 
                // For now just append.
            }
        } else if (key === 'ESC') {
            setInput('');
            setGhostText('');
        } else {
            // VirtualKeyboard appends via this handler?? 
            // Actually VirtualKeyboard calls this with a single char.
            // But TextInput calls handleInputChange with full text.
            // Wait, handleKeyPress logic for 'TAB'/'ESC' is separate from text input.
            // If onKeyPress is for VirtualKeyboard, then we need to manually update input state?
            // The existing code: setInput(prev => prev + key);
            // Yes.
            setInput(prev => {
                const next = prev + key;
                setGhostText(getAutocompleteSuggestion(next));
                return next;
            });
        }
    };

    const handleCommand = async () => {
        const cmdToRun = input; // Strict input
        if (!cmdToRun) return;

        const response = await commandExecutor.execute(input, state);
        const { output: cmdOutput, newState, navigationAction, uiAction } = response;

        if (uiAction === 'CLEAR') {
            setOutputLines([]);
            if (newState) {
                setState(prev => ({ ...prev, ...newState }));
            }
            setInput('');
            setGhostText('');
            return;
        }

        if (navigationAction && navigationAction.type === 'NAVIGATE') {
            if (navigationAction.target === 'Editor') {
                // Trigger CRT Blink
                setIsTransitioning(true);
                setTimeout(() => {
                    setActiveApp({ type: 'VIM', filename: navigationAction.params.filename });
                    setTimeout(() => setIsTransitioning(false), 300);
                }, 100);
                return;
            }
            // Other nav?
            (navigation.navigate as any)(navigationAction.target, navigationAction.params);
            return;
        }

        setOutputLines(prev => [
            ...prev,
            { text: `> ${input}`, type: 'input' }, // Simplified echo
            { text: cmdOutput, type: 'output' }
        ]);
        if (newState) {
            setState(prev => ({ ...prev, ...newState }));
        }
        setInput('');
        setGhostText('');

        // Procedural event simulation after a few commands
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

// Sub-component to safely use the hook
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
        fontSize: THEME.typography.fontSize.sm, // Smaller label
        marginBottom: THEME.spacing.xs,
        opacity: 0.8,
        letterSpacing: 1,
    },
    inputContainer: {
        width: '100%',
        position: 'relative',
        justifyContent: 'center',
        // Optional: Add a background or border to define the input area more clearly
        // backgroundColor: 'rgba(0, 255, 65, 0.05)', 
        // padding: THEME.spacing.xs,
    },
    input: {
        width: '100%',
        color: THEME.colors.text.primary,
        fontFamily: THEME.typography.fontFamily,
        fontSize: THEME.typography.fontSize.lg,
        padding: 0,
        height: 30, // Fixed height to roughly match font size
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
        backgroundColor: THEME.colors.background, // Black out
        zIndex: 999, // On top of everything
    }
});
