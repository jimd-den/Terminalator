import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useGame } from '../context/GameContext';
import { THEME } from '../../frameworks-drivers/ui/Theme';
import { ConsoleLayout } from '../components/ConsoleLayout';
import { VirtualKeyboard } from '../components/VirtualKeyboard';

type RootStackParamList = {
    Editor: { filename: string };
};

type EditorScreenRouteProp = RouteProp<RootStackParamList, 'Editor'>;

export const EditorScreen: React.FC = () => {
    const navigation = useNavigation();
    const route = useRoute<EditorScreenRouteProp>();
    const { fs } = useGame();
    const { filename } = route.params;

    const [content, setContent] = useState('');
    const [mode, setMode] = useState<'NORMAL' | 'INSERT' | 'COMMAND'>('NORMAL');
    const [commandInput, setCommandInput] = useState('');
    const [statusMessage, setStatusMessage] = useState('');

    const contentInputRef = useRef<TextInput>(null);
    const commandInputRef = useRef<TextInput>(null);
    const hiddenInputRef = useRef<TextInput>(null);

    // Keep keyboard up for Normal mode
    useEffect(() => {
        if (mode === 'NORMAL') {
            hiddenInputRef.current?.focus();
        } else if (mode === 'INSERT') {
            contentInputRef.current?.focus();
        } else if (mode === 'COMMAND') {
            commandInputRef.current?.focus();
        }
    }, [mode]);

    const handleHiddenInput = (text: string) => {
        if (!text) return;
        const char = text.charAt(text.length - 1).toLowerCase();

        if (char === 'i') {
            setMode('INSERT');
        } else if (char === ':') {
            // Transition to command mode handled by effect? 
            // We need to set state and clear the hidden input
            setMode('COMMAND');
            setCommandInput(':');
        }
        // Clear hidden input to keep it ready for next char
        hiddenInputRef.current?.clear();
    };

    useEffect(() => {
        // Load file content
        const path = filename.startsWith('/') ? filename : `/home/operator/${filename}`; // Default path assumption, logic can be improved
        // Actually, let's use a simpler heuristic or assume current directory logic is handled elsewhere.
        // For now, let's search for the file or create it in current dir. 
        // Since we don't have simplified path context passed easily, let's just use the filename search or look in common places.
        // Better: GameCommandExecutor resolved the path? No, it passed filename.
        // Let's assume absolute path management is tricky without passing full path.
        // FIX: Let's assume files are in / if no path, but TerminalState has CWD.
        // We should probably access TerminalState? No, FS is shared.
        // Let's implement a simple find or creates in / for now to unblock.

        // Improve: Check if file exists in FS. If not, empty string.
        // Logic: Recursively search not efficient.
        // Assumption for MVP: All user files in / or /home/operator.
        // Let's try to read from where it likely is.
        // Implementation detail: we will rely on a simple path construction.
        const node = fs.getNode(filename.startsWith('/') ? filename : `/home/operator/${filename}`);
        if (node && node.type === 'file') {
            setContent(node.content || '');
        } else {
            // New file
            setContent('');
            setStatusMessage(' [New File] ');
        }
    }, [filename, fs]);

    const handleSave = () => {
        const path = filename.startsWith('/') ? filename : `/home/operator/${filename}`;
        // Ensure directory exists? For now assume /home/operator exists.
        // We need a method in FS to write file.
        // FS entity currently doesn't have a public write method exposed easily purely by structure.
        // We might need to implement a helper or manually traverse.
        // Let's implement a manual update on the FS root for now or helper.
        // This is a bit of a hack without a proper FS write method.
        // Adding a write helper to FS would be cleaner, but modifying Entity in Presentation layer is okay if we access it directly.

        // Actually, let's do a quick traversal to find parent and add child.
        // Simplified: just put in /home/operator for this demo if not absolute.

        const targetDir = fs.root.children?.['home']?.children?.['operator'];
        if (targetDir && targetDir.children) {
            targetDir.children[filename] = {
                name: filename,
                type: 'file',
                content: content,
                owner: 'operator',
                permissions: 'rw-------',
                updatedAt: new Date().toISOString()
            };
            setStatusMessage(`"${filename}" written`);
        } else {
            setStatusMessage('Error: Could not save file (filesystem structure issue).');
        }
    };

    const handleCommandSubmit = () => {
        const cmd = commandInput.trim();
        if (cmd === ':w') {
            handleSave();
            setMode('NORMAL');
        } else if (cmd === ':q') {
            navigation.goBack();
        } else if (cmd === ':wq') {
            handleSave();
            navigation.goBack();
        } else {
            setStatusMessage(`E492: Not an editor command: ${cmd}`);
            setMode('NORMAL');
        }
        setCommandInput('');
    };



    // To ensure "clean" hidden input behavior, we might need a workaround for Android
    // where clear() might not fire onChange text if strictly controlled?
    // Let's rely on standard TextInput behavior.

    return (
        <ConsoleLayout
            status={`EDITING: ${filename} [${mode}]`}
            topContent={
                <View style={styles.editorContainer}>
                    {/* Hidden Input for Normal Mode */}
                    <TextInput
                        ref={hiddenInputRef}
                        style={styles.hiddenInput}
                        autoFocus={true}
                        onChangeText={handleHiddenInput}
                        autoCapitalize="none"
                        autoCorrect={false}
                    />

                    <TextInput
                        ref={contentInputRef}
                        style={styles.contentInput}
                        multiline
                        value={content}
                        onChangeText={setContent}
                        editable={mode === 'INSERT'}
                        autoCapitalize="none"
                        autoCorrect={false}
                        textAlignVertical="top"
                        onSelectionChange={() => {
                            if (mode === 'NORMAL') {
                                // Maybe handle navigation in normal mode? 
                            }
                        }}
                    />
                </View>
            }
            middleContent={<VirtualKeyboard onKeyPress={(key) => {
                if (mode === 'INSERT') {
                    setContent(prev => prev + key); // Simplified handling
                } else if (key === 'ESC') {
                    setMode('NORMAL');
                }
                // Handle navigation keys?
            }} />}
            bottomContent={
                <View style={styles.footer}>
                    <View style={styles.statusBar}>
                        <Text style={styles.statusText}>
                            {mode === 'NORMAL' ? '-- NORMAL --' :
                                mode === 'INSERT' ? '-- INSERT --' :
                                    '-- COMMAND --'}
                            {' '}{statusMessage}
                        </Text>
                    </View>

                    {mode === 'COMMAND' ? (
                        <TextInput
                            ref={commandInputRef}
                            style={styles.commandInput}
                            value={commandInput}
                            onChangeText={setCommandInput}
                            onSubmitEditing={handleCommandSubmit}
                            autoFocus={true}
                            placeholder=":"
                            placeholderTextColor={THEME.colors.secondary}
                        />
                    ) : (
                        <View style={styles.buttonRow}>
                            <Text
                                style={styles.hintText}
                                onPress={() => { setMode('INSERT'); contentInputRef.current?.focus(); }}>
                                [i] INSERT
                            </Text>
                            <Text
                                style={styles.hintText}
                                onPress={() => { setMode('COMMAND'); setCommandInput(':'); setTimeout(() => commandInputRef.current?.focus(), 100); }}>
                                [:] CMD
                            </Text>
                            {mode === 'INSERT' && (
                                <Text
                                    style={styles.hintText}
                                    onPress={() => { setMode('NORMAL'); }}>
                                    [ESC]
                                </Text>
                            )}
                        </View>
                    )}
                </View>
            }
        />
    );
};

const styles = StyleSheet.create({
    // Structural styles replaced by ConsoleLayout
    editorContainer: {
        flex: 1,
        // Remove padding to fit topBox? topBox has padding.
    },
    contentInput: {
        flex: 1,
        color: THEME.colors.text.primary,
        fontFamily: THEME.typography.fontFamily,
        fontSize: THEME.typography.fontSize.md,
        lineHeight: 24,
    },
    footer: {
        // No border/bg as container has it
        flex: 1,
        justifyContent: 'center',
    },
    statusBar: {
        marginBottom: THEME.spacing.xs,
    },
    statusText: {
        color: THEME.colors.primary,
        fontWeight: 'bold',
        fontFamily: THEME.typography.fontFamily,
    },
    commandInput: {
        color: THEME.colors.text.primary,
        fontFamily: THEME.typography.fontFamily,
        fontSize: THEME.typography.fontSize.md,
        height: 40,
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 20,
    },
    hintText: {
        color: THEME.colors.text.dim,
        fontFamily: THEME.typography.fontFamily,
        borderWidth: 1,
        borderColor: THEME.colors.border,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    hiddenInput: {
        position: 'absolute',
        width: 1,
        height: 1,
        opacity: 0,
    }
});
