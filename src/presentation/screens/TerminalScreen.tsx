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
            (navigation.navigate as any)(navigationAction.target, navigationAction.params);
            // Optionally clear input here or wait for return?
            // Usually we clear input so when they come back it's fresh.
            setInput('');
            setGhostText('');
            // Do NOT print the output if we navigate? Or print "Opening..." then navigate?
            // The executor returns "Opening...", so let's print it.
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
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.flex}
            >
                <View style={styles.header}>
                    <Text style={styles.headerText}>[ STATUS: OPERATIONAL ]</Text>
                    <Text style={styles.headerText}>{new Date().toLocaleTimeString()}</Text>
                </View>

                {/* TOP BOX: Output/Environment */}
                <View style={styles.outputBox}>
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
                </View>

                {/* MIDDLE: Virtual Toolbar */}
                <VirtualKeyboard onKeyPress={handleKeyPress} />

                {/* BOTTOM BOX: Input/Prompt */}
                <View style={styles.inputBox}>
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
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: THEME.colors.background,
    },
    flex: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: THEME.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: THEME.colors.border,
    },
    headerText: {
        color: THEME.colors.text.dim,
        fontFamily: THEME.typography.fontFamily,
        fontSize: THEME.typography.fontSize.sm,
    },
    outputBox: {
        flex: 2,
        margin: THEME.spacing.md,
        padding: THEME.spacing.md,
        borderWidth: THEME.borders.width,
        borderColor: THEME.colors.border,
        backgroundColor: THEME.colors.surface,
    },
    inputBoxWrapper: {
        flex: 0,
    },
    inputBox: {
        margin: THEME.spacing.md,
        marginTop: 0,
        padding: THEME.spacing.md,
        borderWidth: THEME.borders.width,
        borderColor: THEME.colors.primary,
        backgroundColor: THEME.colors.surface,
        minHeight: 60,
    },
    inputContainer: {
        flex: 1,
        position: 'relative',
        justifyContent: 'center',
    },
    ghostText: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        color: THEME.colors.text.dim, // Should be same font as input
        zIndex: 0,
    },
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
    input: {
        flex: 1,
        color: THEME.colors.text.primary,
        fontFamily: THEME.typography.fontFamily,
        fontSize: THEME.typography.fontSize.lg,
        padding: 0,
    },
});
