import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable } from 'react-native';
import { THEME } from '../../../frameworks-drivers/ui/Theme';
import { useGame } from '../../context/GameContext';
import { VirtualKeyboard } from '../VirtualKeyboard';

interface VimEditorProps {
    filename: string;
    onExit: () => void;
}

export const useVimEditor = (filename: string, onExit: () => void) => {
    const { fs } = useGame();

    // -- Synchronous State (Refs) --
    // We use Refs for authoritative state to handle batch updates synchronously.
    const state = useRef({
        lines: [''],
        cursor: { line: 0, col: 0 },
        mode: 'NORMAL' as 'NORMAL' | 'INSERT' | 'COMMAND',
        pendingAction: null as null | string
    });

    // -- React State (for Rendering) --
    const [renderTrigger, setRenderTrigger] = useState(0);
    const [commandInput, setCommandInput] = useState('');
    const [statusMessage, setStatusMessage] = useState('');
    const [isMounting, setIsMounting] = useState(true);

    // -- Refs --
    const hiddenInputRef = useRef<TextInput>(null);
    const commandInputRef = useRef<TextInput>(null);

    // -- Helper: Sync State to Render --
    const sync = () => {
        setRenderTrigger(prev => prev + 1);
    };

    // -- Initialization --
    useEffect(() => {
        setIsMounting(true);
        const timer = setTimeout(() => setIsMounting(false), 50);

        // Load file
        const path = filename.startsWith('/') ? filename : `/home/operator/${filename}`;
        const node = fs.getNode(path);
        if (node && node.type === 'file') {
            const content = node.content || '';
            state.current.lines = content.split('\n');
        } else {
            state.current.lines = [''];
            setStatusMessage(' [New File] ');
        }
        sync();

        return () => clearTimeout(timer);
    }, [filename, fs]);

    // -- Focus Management --
    const refocus = () => {
        if (state.current.mode === 'COMMAND') {
            commandInputRef.current?.focus();
        } else {
            hiddenInputRef.current?.focus();
        }
    };

    useEffect(() => {
        const interval = setInterval(refocus, 1000);
        refocus();
        return () => clearInterval(interval);
    }, [renderTrigger]); // Depend on renderTrigger (which changes with mode)

    // -- Logic Helpers (Direct Mutation) --
    const updateLine = (index: number, newLine: string) => {
        state.current.lines[index] = newLine;
    };

    const moveCursor = (dLine: number, dCol: number) => {
        const s = state.current;
        let newLine = s.cursor.line + dLine;

        // Clamp Line
        if (newLine < 0) newLine = 0;
        if (newLine >= s.lines.length) newLine = s.lines.length - 1;

        let newCol = s.cursor.col + dCol;
        const lineLen = s.lines[newLine].length;

        // Clamp Col
        const maxCol = s.mode === 'INSERT' ? lineLen : Math.max(0, lineLen - 1);

        if (newCol < 0) newCol = 0;
        if (newCol > maxCol) newCol = maxCol;

        // Maintain col when moving lines
        if (dLine !== 0) {
            const destLen = s.lines[newLine].length;
            const destMax = s.mode === 'INSERT' ? destLen : Math.max(0, destLen - 1);
            if (s.cursor.col > destMax) newCol = destMax;
            else newCol = s.cursor.col;
        }

        s.cursor = { line: newLine, col: newCol };
    };

    // -- Input Handling --
    const [inputValue, setInputValue] = useState(' ');

    const handleHiddenInput = (text: string) => {
        // Detect Backspace
        if (text.length === 0) {
            handleBackspace();
            setInputValue(' ');
            sync();
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

        // Handle newlines explicitly if text contains them
        for (const char of newContent) {
            if (char === '\n') {
                handleNewline();
            } else {
                handleKeyInput(char);
            }
        }

        setInputValue(' ');
        sync();
    };

    const handleNewline = () => {
        const s = state.current;
        if (s.mode === 'INSERT') {
            const currentLine = s.lines[s.cursor.line];
            const beforeCursor = currentLine.slice(0, s.cursor.col);
            const afterCursor = currentLine.slice(s.cursor.col);

            // Update current line
            updateLine(s.cursor.line, beforeCursor);

            // Insert new line after
            s.lines.splice(s.cursor.line + 1, 0, afterCursor);

            // Move cursor
            s.cursor = { line: s.cursor.line + 1, col: 0 };
        } else if (s.mode === 'NORMAL') {
            moveCursor(1, 0);
        } else if (s.mode === 'COMMAND') {
            handleCommandSubmit();
        }
    };

    const handleBackspace = () => {
        const s = state.current;
        const { mode, cursor, lines } = s;

        if (mode === 'INSERT') {
            const line = lines[cursor.line];
            if (cursor.col > 0) {
                const newLine = line.slice(0, cursor.col - 1) + line.slice(cursor.col);
                updateLine(cursor.line, newLine);
                moveCursor(0, -1);
            } else if (cursor.line > 0) {
                const prevLine = lines[cursor.line - 1];
                const currLine = lines[cursor.line];
                updateLine(cursor.line - 1, prevLine + currLine);
                s.lines.splice(cursor.line, 1); // Remove line
                s.cursor = { line: cursor.line - 1, col: prevLine.length };
            }
        } else if (mode === 'NORMAL') {
            moveCursor(0, -1);
        } else if (mode === 'COMMAND') {
            setCommandInput(prev => prev.slice(0, -1));
        }
    };

    const handleKeyInput = (key: string) => {
        const s = state.current;

        if (key === '\n') {
            handleNewline();
            return;
        }

        if (s.mode === 'NORMAL') {
            // Check for pending action (e.g. 'd')
            if (s.pendingAction === 'd') {
                if (key === 'd') {
                    // Execute 'dd' -> Delete current line
                    s.lines.splice(s.cursor.line, 1);

                    // If empty, ensure at least one empty line
                    if (s.lines.length === 0) s.lines = [''];

                    // Clamp cursor
                    if (s.cursor.line >= s.lines.length) {
                        s.cursor.line = Math.max(0, s.lines.length - 1);
                    }
                    s.cursor.col = 0; // Reset col on line delete usually

                    s.pendingAction = null;
                    return;
                } else {
                    // Cancel pending action if not 'd' (or implement 'dw' later)
                    s.pendingAction = null;
                }
            }

            switch (key.toLowerCase()) {
                case 'h': moveCursor(0, -1); break;
                case 'j': moveCursor(1, 0); break;
                case 'k': moveCursor(-1, 0); break;
                case 'l': moveCursor(0, 1); break;
                case 'i': s.mode = 'INSERT'; setStatusMessage('-- INSERT --'); break;
                case ':': s.mode = 'COMMAND'; setCommandInput(':'); break;
                case 'd': s.pendingAction = 'd'; break; // Start delete op
                case 'x':
                    const line = s.lines[s.cursor.line];
                    if (line.length > 0) {
                        const newLine = line.slice(0, s.cursor.col) + line.slice(s.cursor.col + 1);
                        updateLine(s.cursor.line, newLine);
                        // Adjust cursor if at end
                        if (s.cursor.col >= newLine.length && s.cursor.col > 0) {
                            moveCursor(0, -1);
                        }
                    }
                    break;
                case 'a':
                    s.mode = 'INSERT';
                    setStatusMessage('-- INSERT --');
                    moveCursor(0, 1);
                    break;
            }
        } else if (s.mode === 'INSERT') {
            const line = s.lines[s.cursor.line];
            const newLine = line.slice(0, s.cursor.col) + key + line.slice(s.cursor.col);
            updateLine(s.cursor.line, newLine);
            moveCursor(0, 1);
        } else if (s.mode === 'COMMAND') {
            // Command input is still React state for TextInput
            // Ideally we'd move it too, but it's isolated.
            setCommandInput(prev => prev + key);
        }
    };

    const handleVirtualKey = (key: string) => {
        const s = state.current;

        if (key === 'ESC') {
            s.mode = 'NORMAL';
            setStatusMessage('');
            moveCursor(0, 0);
            sync();
            return;
        }

        // Nav
        if (key === 'UP') { moveCursor(-1, 0); sync(); return; }
        if (key === 'DOWN') { moveCursor(1, 0); sync(); return; }
        if (key === 'LEFT') { moveCursor(0, -1); sync(); return; }
        if (key === 'RIGHT') { moveCursor(0, 1); sync(); return; }

        if (key === 'TAB') {
            handleKeyInput('    ');
            sync();
            return;
        }

        if (s.mode === 'INSERT' || s.mode === 'NORMAL') {
            handleKeyInput(key);
            sync();
        }
    };

    // -- Save/Command Logic --
    const handleSave = () => {
        const fullPath = filename.startsWith('/') ? filename : `/home/operator/${filename}`;
        const content = state.current.lines.join('\n');
        try {
            const existingNode = fs.getNode(fullPath);
            if (existingNode && existingNode.type === 'file') {
                existingNode.content = content;
                existingNode.updatedAt = new Date().toISOString();
                setStatusMessage(`"${filename}" written`);
            } else {
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
            state.current.mode = 'NORMAL';
        } else if (cmd === ':q') {
            onExit();
        } else if (cmd === ':wq') {
            handleSave();
            onExit();
        } else {
            setStatusMessage(`E492: Not an editor command: ${cmd}`);
            state.current.mode = 'NORMAL';
        }
        setCommandInput('');
        sync();
    };

    // -- Rendering --
    // Render from state.current, using renderTrigger to subscribe
    const { lines, cursor, mode } = state.current;

    const renderContent = () => {
        return (
            <Pressable style={{ flex: 1 }} onPress={() => { refocus(); }}>
                {lines.map((lineContent, lineIdx) => {
                    const isCurrentLine = lineIdx === cursor.line;

                    if (isCurrentLine) {
                        const head = lineContent.slice(0, cursor.col);
                        const char = lineContent[cursor.col] || ' ';
                        const tail = lineContent.slice(cursor.col + 1);

                        return (
                            <Text key={lineIdx} style={styles.lineText}>
                                {head}
                                <Text style={
                                    mode === 'INSERT'
                                        ? { color: THEME.colors.primary, textDecorationLine: 'underline' }
                                        : { backgroundColor: THEME.colors.primary, color: THEME.colors.background }
                                }>
                                    {char}
                                </Text>
                                {tail}
                            </Text>
                        );
                    }
                    return (
                        <Text key={lineIdx} style={styles.lineText}>{lineContent || ' '}</Text>
                    );
                })}
                <View style={{ flex: 1 }} />
            </Pressable>
        );
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
                multiline={true} // Capture Enter
                editable={true}
                caretHidden={true}
                autoFocus={true}
            />
            <View style={styles.contentArea}>
                {renderContent()}
            </View>
            <View style={styles.statusBar}>
                <Text style={styles.statusText}>
                    {mode === 'NORMAL' ? '-- NORMAL --' :
                        mode === 'INSERT' ? '-- INSERT --' :
                            '-- COMMAND --'}
                    {' '}{statusMessage}
                </Text>
                <Text style={styles.statusText}>
                    Ln {cursor.line + 1}, Col {cursor.col + 1}
                </Text>
            </View>
        </View>
    );

    const middleContent = (
        <VirtualKeyboard onKeyPress={handleVirtualKey} />
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
                    autoFocus
                />
            ) : (
                <View style={styles.buttonRow}>
                    <Pressable style={styles.hintButton} onPress={() => { state.current.mode = 'INSERT'; setStatusMessage('-- INSERT --'); sync(); }}>
                        <Text style={styles.hintText}>[I]</Text>
                    </Pressable>
                    <Pressable style={styles.hintButton} onPress={() => { state.current.mode = 'COMMAND'; setCommandInput(':'); sync(); }}>
                        <Text style={styles.hintText}>[:]</Text>
                    </Pressable>
                    <Pressable style={styles.hintButton} onPress={() => { state.current.mode = 'NORMAL'; setStatusMessage(''); sync(); }}>
                        <Text style={styles.hintText}>[ESC]</Text>
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
    lineText: {
        color: THEME.colors.text.primary,
        fontFamily: THEME.typography.fontFamily,
        fontSize: THEME.typography.fontSize.md,
        lineHeight: 24,
    },
    cursorBlock: {
        backgroundColor: THEME.colors.primary,
    },
    cursorInsert: {
        backgroundColor: THEME.colors.primary,
        width: 2,
    },
    footer: {
        // remove flex: 1 to allow content to determine height within bottomBox
        justifyContent: 'center',
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
    commandInput: {
        color: THEME.colors.text.primary,
        fontFamily: THEME.typography.fontFamily,
        fontSize: THEME.typography.fontSize.md,
        height: 40,
        backgroundColor: THEME.colors.background,
        paddingHorizontal: THEME.spacing.sm,
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 10,
        justifyContent: 'center',
        flexWrap: 'wrap', // Prevent cutoff on small screens
    },
    hintButton: {
        borderWidth: 1,
        borderColor: THEME.colors.border,
        paddingHorizontal: 8, // Reduced from 12
        paddingVertical: 6,   // Reduced from 8
        backgroundColor: 'rgba(0, 255, 65, 0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    hintText: {
        color: THEME.colors.text.primary,
        fontFamily: THEME.typography.fontFamily,
        fontSize: THEME.typography.fontSize.sm, // Keep small
        textAlign: 'center',
    },
    crtBlinkOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: THEME.colors.background,
        zIndex: 999,
    }
});
