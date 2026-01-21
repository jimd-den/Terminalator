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

import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useInput } from '../../context/InputContext';
import { THEME } from '../../Theme';
import { useGame } from '../../context/GameContext';
import { VirtualKeyboard } from '../VirtualKeyboard';
import { VimSimulator } from '../../../../interface-adapters/VimSimulator';
import { HighlighterRegistry } from '../../../../interface-adapters/vim/HighlighterRegistry';
import { useTheme } from '../../context/ThemeContext';

interface VimEditorProps {
    filename: string;
    onExit: () => void;
}

const highlighterRegistry = new HighlighterRegistry();

export const useVimEditor = (filename: string, onExit: () => void) => {
    const { fs } = useGame();
    const { theme, settings } = useTheme();
    const colors = theme.colors;

    // -- Permanent Logic Controller --
    const validator = useMemo(() => new VimSimulator(fs, filename), [filename, fs]);
    const simulator = validator; // Alias to keep old code working
    const highlighter = useMemo(() => highlighterRegistry.getHighlighterForFile(filename), [filename]);

    const [state, setState] = useState(simulator.getSnapshot());
    const [commandInput, setCommandInput] = useState('');
    const [isMounting, setIsMounting] = useState(true);

    const handleCommandSubmit = React.useCallback(() => {
        const { exit, message } = simulator.executeCommand(commandInput);
        if (exit) onExit();
        else {
            const nextState = simulator.getSnapshot();
            nextState.statusMessage = message;
            setState(nextState);
            setCommandInput('');
        }
    }, [commandInput, onExit, simulator]);

    const { gameManager } = useGame(); // Need gameManager to access TutorEngine

    const handleVirtualKey = React.useCallback((key: string) => {
        // -- TUTOR INTERCEPTION --
        if (gameManager.tutorEngine.isActive()) {
            const lesson = gameManager.tutorEngine.getCurrentLesson();
            // Only intercept if we are in a VIM lesson type, OR if we are transitioning?
            // If lesson is SHELL, Vim shouldn't be active anyway.
            // If lesson is VIM_INSERT or VIM_COMMAND, we track.
            if (lesson && (lesson.type === 'VIM_INSERT' || lesson.type === 'VIM_COMMAND' || lesson.type === 'SHELL')) {
                // Note: 'SHELL' lesson might use 'vim filename' to enter vim. 
                // If we are in Vim but lesson is SHELL, it means we just entered. 
                // We might need to advance lesson to 'VIM_BASICS'? 
                // Ideally TutorEngine handles this transition logic.

                // For now, if Tutor is active, pass input to it?
                // But Vim is complex. Tutor needs to know if we typed 'i' to enter insert mode.
                // TutorEngine.handleInput just matches string.
                // If lesson text is "iHello<ESC>", handling 'i' advances it.
                // We still need to letting VimSimulator process it so the UI updates!

                // 1. Pass to Tutor (non-blocking, just scoring)
                gameManager.tutorEngine.handleInput(key);

                // 2. Pass to Simulator (Visuals)
                // We always pass to simulator so user sees what they type.
            }
        }

        if (key === 'BACKSPACE') {
            if (state.mode === 'COMMAND') {
                if (commandInput.length > 0) {
                    setCommandInput(prev => prev.slice(0, -1));
                } else if (commandInput.length === 0) {
                    // Exit command mode if backspace on empty
                    simulator.handleInput('ESC');
                    setState(simulator.getSnapshot());
                }
                return;
            }
            setState(simulator.handleInput('BACKSPACE'));
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
            if (key.length === 1) setCommandInput(prev => prev + key);
            return;
        }

        // Special handling for Entering Command Mode
        if (state.mode === 'NORMAL' && key === ':') {
            setCommandInput(':');
        }

        setState(simulator.handleInput(key));
    }, [state.mode, commandInput, simulator, handleCommandSubmit, gameManager]);

    const { setOnInput, setOnKeyPress, refocus } = useInput();

    React.useEffect(() => {
        // Wire up global input
        setOnInput((text) => {
            // Handle pasted text or fast typing
            for (const char of text) {
                if (char === '\n') handleVirtualKey('ENTER');
                else handleVirtualKey(char);
            }
        });
        setOnKeyPress((key) => {
            handleVirtualKey(key);
        });
    }, [handleVirtualKey, setOnInput, setOnKeyPress]);

    // -- Initialization --
    useEffect(() => {
        setIsMounting(true);
        const timer = setTimeout(() => setIsMounting(false), 150);
        return () => clearTimeout(timer);
    }, [filename]);

    // Force focus when mounting this "active app"
    useEffect(() => {
        refocus();
        const interval = setInterval(refocus, 2000);
        return () => clearInterval(interval);
    }, [refocus]);

    const dynamicStyles = StyleSheet.create({
        editorContainer: {
            flex: 1,
            backgroundColor: colors.surface,
        },
        contentArea: {
            flex: 1,
            padding: THEME.spacing.sm,
        },
        scrollContent: {
            paddingBottom: THEME.spacing.xl,
        },
        lineWrapper: {
            flexDirection: 'row',
            paddingHorizontal: THEME.spacing.xs,
        },
        lineText: {
            color: colors.text.primary,
            fontFamily: settings.fontFamily,
            fontSize: THEME.typography.fontSize.md,
            lineHeight: 24,
        },
        errorLine: {
            backgroundColor: 'rgba(255, 0, 0, 0.15)',
            borderLeftWidth: 3,
            borderLeftColor: colors.error,
        },
        cursorBlock: {
            backgroundColor: colors.primary,
            display: 'flex',
        },
        footer: {
            justifyContent: 'center',
            padding: THEME.spacing.sm,
        },
        statusBar: {
            backgroundColor: colors.background,
            paddingVertical: THEME.spacing.sm,
            paddingHorizontal: THEME.spacing.md,
            borderTopWidth: 1,
            borderTopColor: colors.primary,
            flexDirection: 'row',
            justifyContent: 'space-between',
        },
        statusText: {
            color: colors.primary,
            fontWeight: 'bold',
            fontFamily: settings.fontFamily,
        },
        errorStatusText: {
            color: colors.error,
        },
        commandRow: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.background,
            paddingHorizontal: THEME.spacing.sm,
            height: 40,
        },
        commandText: {
            color: colors.text.primary,
            fontFamily: settings.fontFamily,
            fontSize: THEME.typography.fontSize.md,
        },
        commandCursor: {
            width: 10,
            height: 20,
            backgroundColor: colors.primary,
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
            borderColor: colors.border,
            paddingHorizontal: 8,
            paddingVertical: 4,
            backgroundColor: 'rgba(0, 255, 65, 0.05)',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 40,
        },
        hintText: {
            color: colors.text.primary,
            fontFamily: settings.fontFamily,
            fontSize: THEME.typography.fontSize.sm,
            textAlign: 'center',
        },
        crtBlinkOverlay: {
            ...StyleSheet.absoluteFillObject,
            backgroundColor: colors.background,
            zIndex: 999,
        }
    });

    const getTokenColor = (type: string) => {
        switch (type) {
            case 'keyword': return colors.secondary;
            case 'string': return '#CE9178';
            case 'comment': return colors.text.dim;
            case 'number': return '#B5CEA8';
            case 'operator': return '#D4D4D4';
            default: return colors.text.primary;
        }
    };

    const renderLine = (lineContent: string, lineIdx: number) => {
        const isCurrentLine = lineIdx === state.cursor.line;
        const lineError = state.lintErrors.find(e => e.line === lineIdx + 1);
        const tokens = highlighter.highlight(lineContent);
        let cursorRendered = false;

        return (
            <View key={lineIdx} style={[dynamicStyles.lineWrapper, lineError && dynamicStyles.errorLine]}>
                <Text style={dynamicStyles.lineText} numberOfLines={1}>
                    {tokens.map((token, tokenIdx) => {
                        const tokenColor = getTokenColor(token.type);
                        if (isCurrentLine && !cursorRendered) {
                            let offsetBefore = tokens.slice(0, tokenIdx).reduce((acc, t) => acc + t.text.length, 0);
                            const cursorInToken = state.cursor.col >= offsetBefore && state.cursor.col < offsetBefore + token.text.length;

                            if (cursorInToken) {
                                cursorRendered = true;
                                const cursorRelPos = state.cursor.col - offsetBefore;
                                const head = token.text.slice(0, cursorRelPos);
                                const char = token.text[cursorRelPos];
                                const tail = token.text.slice(cursorRelPos + 1);

                                return (
                                    <Text key={tokenIdx} style={{ color: tokenColor }}>
                                        {head}
                                        {state.mode === 'INSERT' && (
                                            <View style={{ width: 2, height: 18, backgroundColor: colors.primary, transform: [{ translateY: 4 }] }} />
                                        )}
                                        <Text style={state.mode === 'NORMAL' ? { backgroundColor: colors.primary, color: colors.background } : {}}>
                                            {char}
                                        </Text>
                                        {tail}
                                    </Text>
                                );
                            }
                        }
                        return <Text key={tokenIdx} style={{ color: tokenColor }}>{token.text}</Text>;
                    })}
                    {isCurrentLine && !cursorRendered && (
                        <View style={state.mode === 'INSERT'
                            ? { width: 2, height: 18, backgroundColor: colors.primary, transform: [{ translateY: 4 }] }
                            : { backgroundColor: colors.primary, height: 20, justifyContent: 'center', transform: [{ translateY: 2 }] }
                        }>
                            <Text style={{ color: colors.background, fontSize: THEME.typography.fontSize.md, opacity: state.mode === 'INSERT' ? 0 : 1 }}> </Text>
                        </View>
                    )}
                </Text>
            </View>
        );
    };

    // We will re-use the existing renderLine for the file content.
    // Main renderLine logic is above at line 264.


    // We will re-use the existing renderLine for the file content.
    // But we add an Overlay to topContent.

    const [tutorState, setTutorState] = useState<{ active: boolean, text: string, completed: string }>({ active: false, text: '', completed: '' });

    // Poll tutor state for UI? Or subscribe?
    // Let's use a quick poll in useEffect or just rely on re-renders if gameManager triggers update?
    // Since TutorEngine is outside React, we need to force update or use a hook.
    // For now, simply reading it during render might lag if no state change happens.
    // Better: Subscribe in useEffect.

    useEffect(() => {
        if (!gameManager.tutorEngine.isActive()) {
            setTutorState({ active: false, text: '', completed: '' });
            return;
        }

        const updateTutor = () => {
            setTutorState({
                active: gameManager.tutorEngine.isActive(),
                text: gameManager.tutorEngine.getGhostText(),
                completed: gameManager.tutorEngine.getCompletedText()
            });
        };

        // Initial sync
        updateTutor();

        // Subscribe
        const unsubscribe = gameManager.tutorEngine.subscribe(() => {
            updateTutor();
        });

        return unsubscribe;
    }, [gameManager.tutorEngine]);

    const topContent = (
        <View style={dynamicStyles.editorContainer}>
            {tutorState.active && (
                <View style={{
                    position: 'absolute', top: 0, left: 0, right: 0,
                    backgroundColor: 'rgba(0,0,0,0.8)', padding: 10, zIndex: 100,
                    borderBottomWidth: 1, borderColor: colors.primary
                }}>
                    <Text style={{ color: colors.primary, fontWeight: 'bold' }}>TUTOR PROTOCOL ACTIVE</Text>
                    <Text style={{ color: colors.text.primary, fontFamily: settings.fontFamily }}>
                        TARGET: <Text style={{ color: colors.secondary }}>{tutorState.completed}</Text>
                        <Text style={{ color: colors.text.dim }}>{tutorState.text}</Text>
                    </Text>
                </View>
            )}

            {isMounting && <View style={dynamicStyles.crtBlinkOverlay} />}
            {/* ... rest of ScrollView ... */}
            <ScrollView
                style={dynamicStyles.contentArea}
                contentContainerStyle={dynamicStyles.scrollContent}
                keyboardShouldPersistTaps="always"
                ref={(ref: ScrollView | null) => {
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
            <View style={dynamicStyles.statusBar}>
                <Text style={[dynamicStyles.statusText, !!state.lintErrors.find(e => e.line === state.cursor.line + 1) && dynamicStyles.errorStatusText]}>
                    {state.lintErrors.find(e => e.line === state.cursor.line + 1)?.message || (state.statusMessage || (state.mode === 'NORMAL' ? '-- NORMAL --' : `-- ${state.mode} --`))}
                </Text>
                <Text style={dynamicStyles.statusText}>
                    {highlighter.language.toUpperCase()} | Ln {state.cursor.line + 1}, Col {state.cursor.col + 1}
                </Text>
            </View>
        </View>
    );

    const middleContent = <VirtualKeyboard onKeyPress={handleVirtualKey} />;

    const bottomContent = (
        <View style={dynamicStyles.footer}>
            {state.mode === 'COMMAND' ? (
                <View style={dynamicStyles.commandRow}>
                    <Text style={dynamicStyles.commandText}>{commandInput}</Text>
                    <View style={dynamicStyles.commandCursor} />
                </View>
            ) : (
                <View style={dynamicStyles.buttonRow}>
                    {['i', ':', 'ESC', 'h', 'j', 'k', 'l'].map(k => (
                        <Pressable key={k} style={dynamicStyles.hintButton} onPress={() => handleVirtualKey(k)}>
                            <Text style={dynamicStyles.hintText}>[{k.toUpperCase()}]</Text>
                        </Pressable>
                    ))}
                </View>
            )}
        </View>
    );

    return { topContent, middleContent, bottomContent };
};
