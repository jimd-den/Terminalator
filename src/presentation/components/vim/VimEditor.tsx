/**
 * VimEditor - Presentation Layer
 * 
 * A high-performance, high-contrast Vim-like text editor for the terminal.
 * 
 * Pillar: THE STORYTELLER’S CODE (Literate Documentation)
 * Pillar: THE FOUR-FOLD SHIELD (Clean Architecture)
 * Pillar: THE BALANCED SCALE (KISS)
 * 
 * Intent:
 * Renders the state provided by the VimSimulator.
 * Minimal logic remains here; most operations are delegated to the domain layer via adapters.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ScrollView } from 'react-native';
import { THEME } from '../../../frameworks-drivers/ui/Theme';
import { useGame } from '../../context/GameContext';
import { VirtualKeyboard } from '../VirtualKeyboard';
import { VimSimulator } from '../../../interface-adapters/VimSimulator';
import { HighlighterRegistry } from '../../../interface-adapters/vim/HighlighterRegistry';

interface VimEditorProps {
    filename: string;
    onExit: () => void;
}

const highlighterRegistry = new HighlighterRegistry();

export const useVimEditor = (filename: string, onExit: () => void) => {
    const { fs } = useGame();

    // -- Permanent Logic Controller --
    const simulator = useMemo(() => new VimSimulator(fs, filename), [filename, fs]);
    const highlighter = useMemo(() => highlighterRegistry.getHighlighterForFile(filename), [filename]);

    // -- React State (for Rendering) --
    const [state, setState] = useState(simulator.getSnapshot());
    const [commandInput, setCommandInput] = useState('');
    const [isMounting, setIsMounting] = useState(true);

    // -- Refs for UI interaction --
    const hiddenInputRef = useRef<TextInput>(null);
    const commandInputRef = useRef<TextInput>(null);

    // -- Initialization --
    useEffect(() => {
        setIsMounting(true);
        const timer = setTimeout(() => setIsMounting(false), 50);
        return () => clearTimeout(timer);
    }, [filename]);

    // -- Focus Management --
    const refocus = () => {
        // Always focus the hidden input, regardless of mode
        hiddenInputRef.current?.focus();
    };

    useEffect(() => {
        const interval = setInterval(refocus, 500);
        refocus();
        return () => clearInterval(interval);
    }, []);

    // -- Input Handling --
    const [inputValue, setInputValue] = useState(' ');

    const handleHiddenInput = (text: string) => {
        // Detect Backspace
        if (text.length === 0) {
            if (state.mode === 'COMMAND') {
                if (commandInput.length > 1) {
                    setCommandInput(prev => prev.slice(0, -1));
                } else {
                    // Backspace on ':' exits command mode
                    simulator.handleInput('ESC');
                    setState(simulator.getSnapshot());
                    setCommandInput('');
                }
            } else {
                setState(simulator.handleInput('BACKSPACE'));
            }
            setInputValue(' ');
            return;
        }

        let newContent = text;
        if (text.startsWith(' ')) {
            newContent = text.slice(1);
        }

        if (newContent.length === 0) {
            setInputValue(' ');
            return;
        }

        // Process characters
        for (const char of newContent) {
            if (char === '\n') {
                if (state.mode === 'COMMAND') {
                    handleCommandSubmit();
                } else {
                    setState(simulator.handleInput('ENTER'));
                }
            } else {
                if (state.mode === 'COMMAND') {
                    setCommandInput(prev => prev + char);
                } else {
                    // Start command mode if ':' pressed
                    if (state.mode === 'NORMAL' && char === ':') {
                        setCommandInput(':');
                    }
                    setState(simulator.handleInput(char));
                }
            }
        }

        setInputValue(' ');
    };

    const handleVirtualKey = (key: string) => {
        if (key === 'BACKSPACE') {
            handleHiddenInput('');
            return;
        }

        if (state.mode === 'COMMAND') {
            if (key === 'ESC') {
                simulator.handleInput('ESC');
                setState(simulator.getSnapshot());
                setCommandInput('');
                return;
            }
            if (key === 'ENTER') {
                handleCommandSubmit();
                return;
            }
            // Other virtual keys like UP/DOWN or specific chars
            if (key.length === 1) {
                setCommandInput(prev => prev + key);
            }
            return;
        }

        setState(simulator.handleInput(key));
    };

    const handleCommandSubmit = () => {
        const { exit, message } = simulator.executeCommand(commandInput);
        if (exit) {
            onExit();
        } else {
            const nextState = simulator.getSnapshot();
            nextState.statusMessage = message;
            setState(nextState);
            setCommandInput('');
        }
    };

    const handleInput = (text: string) => {
        if (state.mode === 'COMMAND') {
            // In COMMAND mode, hiddenInput acts as the command pipe
            // But we already have a separate TextInput for Command mode in the UI?
            // No, let's merge them.
            return;
        }
        handleHiddenInput(text);
    };

    // -- Render Helpers --
    const renderLine = (lineContent: string, lineIdx: number) => {
        const isCurrentLine = lineIdx === state.cursor.line;
        const tokens = highlighter.highlight(lineContent || ' ');

        return (
            <Text key={lineIdx} style={styles.lineText}>
                {tokens.map((token, tokenIdx) => {
                    // For current line, we might need to "break" a token to insert the cursor
                    // but for simplicity (KISS), we use an absolute cursor overlay if possible?
                    // No, let's just highlight the token and handle cursor separately.

                    const tokenColor = getTokenColor(token.type);

                    if (isCurrentLine) {
                        // Find if cursor is within this token
                        let offsetBefore = tokens.slice(0, tokenIdx).reduce((acc, t) => acc + t.text.length, 0);
                        const cursorInToken = state.cursor.col >= offsetBefore && state.cursor.col < offsetBefore + token.text.length;

                        if (cursorInToken) {
                            const cursorRelPos = state.cursor.col - offsetBefore;
                            const head = token.text.slice(0, cursorRelPos);
                            const char = token.text[cursorRelPos] || ' ';
                            const tail = token.text.slice(cursorRelPos + 1);

                            return (
                                <Text key={tokenIdx} style={{ color: tokenColor }}>
                                    {head}
                                    <View style={state.mode === 'INSERT' ? styles.cursorInsert : styles.cursorBlock}>
                                        <Text style={state.mode === 'INSERT' ? { color: tokenColor } : styles.cursorText}>
                                            {char}
                                        </Text>
                                    </View>
                                    {tail}
                                </Text>
                            );
                        }
                    }

                    return (
                        <Text key={tokenIdx} style={{ color: tokenColor }}>
                            {token.text}
                        </Text>
                    );
                })}
                {/* Handle cursor at the end of line */}
                {isCurrentLine && state.cursor.col >= lineContent.length && (
                    <View style={state.mode === 'INSERT' ? styles.cursorInsert : styles.cursorBlock}>
                        <Text style={styles.cursorText}> </Text>
                    </View>
                )}
            </Text>
        );
    };

    const getTokenColor = (type: string) => {
        switch (type) {
            case 'keyword': return THEME.colors.secondary;
            case 'string': return '#CE9178'; // Muted orange/rust
            case 'comment': return THEME.colors.text.dim;
            case 'number': return '#B5CEA8'; // Pale green
            case 'operator': return '#D4D4D4';
            default: return THEME.colors.text.primary;
        }
    };

    const topContent = (
        <View style={styles.editorContainer}>
            {isMounting && <View style={styles.crtBlinkOverlay} />}
            <TextInput
                ref={hiddenInputRef}
                style={styles.hiddenInput}
                value={inputValue}
                onChangeText={handleHiddenInput}
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
                blurOnSubmit={false}
                multiline={true}
                editable={true}
                caretHidden={true}
                autoFocus={true}
            />
            <ScrollView
                style={styles.contentArea}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="always"
                ref={(ref: ScrollView | null) => {
                    // Auto-scroll to current line
                    if (ref) {
                        const lineHeight = 24;
                        ref.scrollTo({ y: state.cursor.line * lineHeight - 100, animated: true });
                    }
                }}
            >
                <Pressable style={{ flex: 1 }} onPress={() => { refocus(); }}>
                    {state.lines.map((line, idx) => renderLine(line, idx))}
                </Pressable>
            </ScrollView>
            <View style={styles.statusBar}>
                <Text style={styles.statusText}>
                    {state.statusMessage || (state.mode === 'NORMAL' ? '-- NORMAL --' : `-- ${state.mode} --`)}
                </Text>
                <Text style={styles.statusText}>
                    {highlighter.language.toUpperCase()} | Ln {state.cursor.line + 1}, Col {state.cursor.col + 1}
                </Text>
            </View>
        </View>
    );

    const middleContent = (
        <VirtualKeyboard onKeyPress={handleVirtualKey} />
    );

    const bottomContent = (
        <View style={styles.footer}>
            {state.mode === 'COMMAND' ? (
                <View style={styles.commandRow}>
                    <Text style={styles.commandText}>{commandInput}</Text>
                    <View style={styles.commandCursor} />
                </View>
            ) : (
                <View style={styles.buttonRow}>
                    <Pressable style={styles.hintButton} onPress={() => handleVirtualKey('i')}>
                        <Text style={styles.hintText}>[I]</Text>
                    </Pressable>
                    <Pressable style={styles.hintButton} onPress={() => handleVirtualKey(':')}>
                        <Text style={styles.hintText}>[:]</Text>
                    </Pressable>
                    <Pressable style={styles.hintButton} onPress={() => handleVirtualKey('ESC')}>
                        <Text style={styles.hintText}>[ESC]</Text>
                    </Pressable>
                    <Pressable style={styles.hintButton} onPress={() => handleVirtualKey('h')}>
                        <Text style={styles.hintText}>[H]</Text>
                    </Pressable>
                    <Pressable style={styles.hintButton} onPress={() => handleVirtualKey('j')}>
                        <Text style={styles.hintText}>[J]</Text>
                    </Pressable>
                    <Pressable style={styles.hintButton} onPress={() => handleVirtualKey('k')}>
                        <Text style={styles.hintText}>[K]</Text>
                    </Pressable>
                    <Pressable style={styles.hintButton} onPress={() => handleVirtualKey('l')}>
                        <Text style={styles.hintText}>[L]</Text>
                    </Pressable>
                </View>
            )}
        </View>
    );

    return { topContent, middleContent, bottomContent };
};

const styles = StyleSheet.create({
    editorContainer: {
        flex: 1,
        backgroundColor: THEME.colors.surface,
    },
    hiddenInput: {
        position: 'absolute',
        width: 1,
        height: 1,
        opacity: 0,
    },
    contentArea: {
        flex: 1,
        padding: THEME.spacing.sm,
    },
    scrollContent: {
        paddingBottom: THEME.spacing.xl,
    },
    lineText: {
        color: THEME.colors.text.primary,
        fontFamily: THEME.typography.fontFamily,
        fontSize: THEME.typography.fontSize.md,
        lineHeight: 24,
    },
    cursorBlock: {
        backgroundColor: THEME.colors.primary,
        display: 'flex',
    },
    cursorInsert: {
        borderLeftWidth: 2,
        borderLeftColor: THEME.colors.primary,
    },
    cursorText: {
        color: THEME.colors.background,
        fontFamily: THEME.typography.fontFamily,
        fontSize: THEME.typography.fontSize.md,
    },
    footer: {
        justifyContent: 'center',
        padding: THEME.spacing.sm,
    },
    statusBar: {
        backgroundColor: THEME.colors.background,
        paddingVertical: THEME.spacing.xs,
        paddingHorizontal: THEME.spacing.sm,
        borderTopWidth: 1,
        borderTopColor: THEME.colors.primary,
        marginTop: 'auto',
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    statusText: {
        color: THEME.colors.primary,
        fontWeight: 'bold',
        fontFamily: THEME.typography.fontFamily,
    },
    commandRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: THEME.colors.background,
        paddingHorizontal: THEME.spacing.sm,
        height: 40,
    },
    commandPrefix: {
        color: THEME.colors.primary,
        fontFamily: THEME.typography.fontFamily,
        fontSize: THEME.typography.fontSize.md,
    },
    commandText: {
        color: THEME.colors.text.primary,
        fontFamily: THEME.typography.fontFamily,
        fontSize: THEME.typography.fontSize.md,
    },
    commandCursor: {
        width: 10,
        height: 20,
        backgroundColor: THEME.colors.primary,
        marginLeft: 2,
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 8,
        justifyContent: 'center',
        flexWrap: 'wrap',
    },
    hintButton: {
        borderWidth: 1,
        borderColor: THEME.colors.border,
        paddingHorizontal: 8,
        paddingVertical: 4,
        backgroundColor: 'rgba(0, 255, 65, 0.05)',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 40,
    },
    hintText: {
        color: THEME.colors.text.primary,
        fontFamily: THEME.typography.fontFamily,
        fontSize: THEME.typography.fontSize.sm,
        textAlign: 'center',
    },
    crtBlinkOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: THEME.colors.background,
        zIndex: 999,
    }
});
