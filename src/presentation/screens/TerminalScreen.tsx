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

export const TerminalScreen: React.FC = () => {
    const { fs, gameManager, commandExecutor } = useGame();
    const navigation = useNavigation();
    const [state, setState] = useState(createInitialTerminalState());
    const [input, setInput] = useState('');
    const [outputLines, setOutputLines] = useState<{ text: string, type: 'input' | 'output' }[]>([
        { text: 'SYSTEM INITIALIZED... BOOT SEQUENCE READY', type: 'output' },
        { text: 'WELCOME TO MAINFRAME v1.0', type: 'output' },
        { text: 'TYPE "mail" TO CHECK TRANSMISSIONS', type: 'output' },
    ]);

    const [ghostText, setGhostText] = useState('');
    const [isTransitioning, setIsTransitioning] = useState(false);

    const suggestions = ['help', 'ls', 'cd', 'cat', 'whoami', 'mail', 'check-comms', 'clear', 'vim', 'man'];

    const handleInputChange = (text: string) => {
        setInput(text);
        if (!text) {
            setGhostText('');
            return;
        }
        const match = suggestions.find(s => s.startsWith(text.toLowerCase()) && s !== text.toLowerCase());
        setGhostText(match ? match.substring(text.length) : '');
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
            setInput(prev => prev + key);
        }
    };

    const handleCommand = () => {
        const cmdToRun = input || (ghostText ? input + ghostText : ''); // Allow running ghost suggestion on enter if partial? No, standard behavior is strictly input.
        if (!cmdToRun) return;

        // Actually standard terminal doesn't autoComplete on enter, but let's stick to strict input for realism unless user tabbed.
        // Waiting for user to be explicit.
        if (!input) return;

        const response = commandExecutor.execute(input, state);
        const { output: cmdOutput, newState, navigationAction } = response;

        if (navigationAction && navigationAction.type === 'NAVIGATE') {
            // Trigger CRT Blink Effect
            setIsTransitioning(true);
            setTimeout(() => {
                (navigation.navigate as any)(navigationAction.target, navigationAction.params);
                // Reset interaction state
                setInput('');
                setGhostText('');
                // Reset transition state after a delay (or when returning?)
                // Actually, when we return, this component re-renders or stays mounted?
                // Navigator keeps it mounted. So we need to unset this.
                // Better: unset it quickly after nav, OR rely on focus listener.
                // Simple approach: unset after slightly longer timeout.
                setTimeout(() => setIsTransitioning(false), 300);
            }, 100); // 100ms blink
            return; // Stop execution here to prevent immediate state updates visible before blink
        }

        setOutputLines(prev => [
            ...prev,
            { text: `${state.user}@system:~$ ${input}`, type: 'input' },
            { text: cmdOutput, type: 'output' }
        ]);
        setState(newState);
        setInput('');
        setGhostText('');

        // Procedural event simulation after a few commands
        if (outputLines.length > 5 && outputLines.length % 4 === 0) {
            const mail = gameManager.spawnNPCEvent();
            setOutputLines(prev => [...prev, { text: `[ NEW TRANSMISSION: ID ${mail.id} FROM ${mail.from} ]`, type: 'output' }]);
        }
    };

    return (
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
                <View style={styles.promptLine}>
                    <Text style={styles.promptText}>{state.user}@system:~$ </Text>
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
    promptLine: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    promptText: {
        color: THEME.colors.secondary,
        fontFamily: THEME.typography.fontFamily,
        fontSize: THEME.typography.fontSize.lg,
    },
    inputContainer: {
        flex: 1,
        position: 'relative',
        justifyContent: 'center',
    },
    input: {
        flex: 1,
        color: THEME.colors.text.primary,
        fontFamily: THEME.typography.fontFamily,
        fontSize: THEME.typography.fontSize.lg,
        padding: 0,
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
