import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { THEME } from '../../../frameworks-drivers/ui/Theme';
import { useGame } from '../../context/GameContext';
import { VirtualKeyboard } from '../VirtualKeyboard';

interface VimEditorProps {
    filename: string;
    onExit: () => void;
}



// Wait, standard FC cannot return an object.
// We must use a Hook!
export const useVimEditor = (filename: string, onExit: () => void) => {
    const { fs } = useGame();

    // ... all state logic ...
    const [content, setContent] = useState('');
    const [mode, setMode] = useState<'NORMAL' | 'INSERT' | 'COMMAND'>('NORMAL');
    const [commandInput, setCommandInput] = useState('');
    const [statusMessage, setStatusMessage] = useState('');
    const [isMounting, setIsMounting] = useState(true);

    const contentInputRef = useRef<TextInput>(null);
    const commandInputRef = useRef<TextInput>(null);
    const hiddenInputRef = useRef<TextInput>(null);

    useEffect(() => {
        setIsMounting(true);
        const timer = setTimeout(() => setIsMounting(false), 50);
        return () => clearTimeout(timer);
    }, [filename]); // Reset on filename change

    // Keep keyboard up for Normal mode
    // Keep keyboard up for Normal mode
    useEffect(() => {
        // Small timeout to ensure component is ready and prevent racing
        const timeoutId = setTimeout(() => {
            if (mode === 'NORMAL') {
                commandInputRef.current?.blur();
                contentInputRef.current?.blur();
                hiddenInputRef.current?.focus();
            } else if (mode === 'INSERT') {
                hiddenInputRef.current?.blur();
                commandInputRef.current?.blur();
                contentInputRef.current?.focus();
            } else if (mode === 'COMMAND') {
                hiddenInputRef.current?.blur();
                contentInputRef.current?.blur();
                commandInputRef.current?.focus();
            }
        }, 50);
        return () => clearTimeout(timeoutId);
    }, [mode]);

    const handleHiddenInput = (text: string) => {
        if (!text) return;
        const char = text.charAt(text.length - 1).toLowerCase();

        if (char === 'i') {
            setMode('INSERT');
        } else if (char === ':') {
            setMode('COMMAND');
            setCommandInput(':');
        }
        hiddenInputRef.current?.clear();
    };

    useEffect(() => {
        const path = filename.startsWith('/') ? filename : `/home/operator/${filename}`;
        const node = fs.getNode(path);
        if (node && node.type === 'file') {
            setContent(node.content || '');
        } else {
            setContent('');
            setStatusMessage(' [New File] ');
        }
    }, [filename, fs]);

    const handleSave = () => {
        const fullPath = filename.startsWith('/') ? filename : `/home/operator/${filename}`;
        try {
            const existingNode = fs.getNode(fullPath);
            if (existingNode && existingNode.type === 'file') {
                existingNode.content = content;
                existingNode.updatedAt = new Date().toISOString();
                setStatusMessage(`"${filename}" written`);
            } else {
                // Determine cwd for relative paths, though we forced absolute above mostly
                // If it doesn't exist, create it.
                // existingNode might be null.
                const newNode = fs.createNode(fullPath, 'file');
                newNode.content = content;
                setStatusMessage(`"${filename}" [New] written`);
            }
        } catch (e: any) {
            setStatusMessage(`Error: ${e.message}`);
        }
    };

    const handleCommandSubmit = () => {
        const cmd = commandInput.trim();
        if (cmd === ':w') {
            handleSave();
            setMode('NORMAL');
        } else if (cmd === ':q') {
            onExit();
        } else if (cmd === ':wq') {
            handleSave();
            onExit();
        } else {
            setStatusMessage(`E492: Not an editor command: ${cmd}`);
            setMode('NORMAL');
        }
        setCommandInput('');
    };

    const topContent = (
        <View style={styles.editorContainer}>
            {isMounting && <View style={styles.crtBlinkOverlay} />}
            <TextInput
                ref={hiddenInputRef}
                style={styles.hiddenInput}
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
            />
            <View style={styles.statusBar}>
                <Text style={styles.statusText}>
                    {mode === 'NORMAL' ? '-- NORMAL --' :
                        mode === 'INSERT' ? '-- INSERT --' :
                            '-- COMMAND --'}
                    {' '}{statusMessage}
                </Text>
            </View>
        </View>
    );

    const middleContent = (
        <VirtualKeyboard onKeyPress={(key) => {
            // Control Keys acting as Commands
            if (key === 'ESC') {
                setMode('NORMAL');
                return;
            }

            // Navigation Keys (Block text insertion for now, or implement future cursor move)
            if (['UP', 'DOWN', 'LEFT', 'RIGHT'].includes(key)) {
                return;
            }

            if (mode === 'INSERT') {
                // Indentation
                if (key === 'TAB') {
                    setContent(prev => prev + '    ');
                    return;
                }

                // Standard Typing
                setContent(prev => prev + key);
            }
        }} />
    );

    const bottomContent = (
        <View style={styles.footer}>


            {mode === 'COMMAND' ? (
                <TextInput
                    ref={commandInputRef}
                    style={styles.commandInput}
                    value={commandInput}
                    onChangeText={setCommandInput}
                    onSubmitEditing={handleCommandSubmit}
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
    );

    return { topContent, middleContent, bottomContent };
};

const styles = StyleSheet.create({
    editorContainer: {
        flex: 1,
    },
    contentInput: {
        flex: 1,
        color: THEME.colors.text.primary,
        fontFamily: THEME.typography.fontFamily,
        fontSize: THEME.typography.fontSize.md,
        lineHeight: 24,
    },
    footer: {
        flex: 1,
        justifyContent: 'center',
    },
    statusBar: {
        backgroundColor: THEME.colors.background, // Ensure high contrast over overlay if needed, or match bg
        paddingVertical: THEME.spacing.xs,
        borderTopWidth: 1,
        borderTopColor: THEME.colors.primary,
        marginTop: 'auto', // Push to bottom of Top Content
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
    },
    crtBlinkOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: THEME.colors.background,
        zIndex: 999,
    }
});
