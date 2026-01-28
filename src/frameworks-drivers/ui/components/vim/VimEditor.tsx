/**
 * VimEditor - Presentation Layer
 * 
 * A high-performance, high-contrast Vim-like text editor for the terminal.
 * 
 * Pillar: THE STORYTELLER'S CODE (Literate Documentation)
 * Pillar: THE FOUR-FOLD SHIELD (Clean Architecture)
 * Pillar: THE BALANCED SCALE (KISS)
 * 
 * Intent:
 * Renders the state provided by the VimSimulator.
 * Composes VimInputController and VimTutorController for clean separation.
 */

import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useInput } from '../../context/InputContext';
import { THEME } from '../../Theme';
import { useGame } from '../../context/GameContext';
import { VirtualKeyboard } from '../VirtualKeyboard';
import { VimSimulator } from '../../../../interface-adapters/VimSimulator';
import { HighlighterRegistry } from '../../../../interface-adapters/vim/HighlighterRegistry';
import { useTheme } from '../../context/ThemeContext';

// Import Controllers
import { useVimInputController } from '../../../../interface-adapters/controllers/VimInputController';
import { useVimTutorController } from '../../../../interface-adapters/controllers/VimTutorController';

interface VimEditorProps {
    filename: string;
    onExit: () => void;
}

const highlighterRegistry = new HighlighterRegistry();

export const useVimEditor = (filename: string, onExit: () => void) => {
    const { fs, gameManager } = useGame();
    const { theme, settings } = useTheme();
    const colors = theme.colors;

    // -- Simulator (Domain Orchestrator) --
    // Create FileSystemService from FileSystem (GameContext provides FileSystem, not service)
    const fsService = useMemo(() => new (require('../../../../domain/services/FileSystemService').FileSystemService)(fs), [fs]);
    const simulator = useMemo(() => new VimSimulator(fsService, filename), [filename, fsService]);
    const highlighter = useMemo(() => highlighterRegistry.getHighlighterForFile(filename), [filename]);

    // -- Controllers --
    const inputController = useVimInputController(simulator, onExit, gameManager.tutorEngine);
    const tutorState = useVimTutorController(gameManager.tutorEngine);

    // -- Mount State --
    const [isMounting, setIsMounting] = React.useState(true);

    // -- Input Context Wiring --
    const { setOnInput, setOnKeyPress, refocus } = useInput();

    React.useEffect(() => {
        setOnInput((text) => {
            for (const char of text) {
                if (char === '\n') inputController.handleVirtualKey('ENTER');
                else inputController.handleVirtualKey(char);
            }
        });
        setOnKeyPress((key) => {
            inputController.handleVirtualKey(key);
        });
    }, [inputController.handleVirtualKey, setOnInput, setOnKeyPress]);

    // -- Initialization --
    useEffect(() => {
        setIsMounting(true);
        const timer = setTimeout(() => setIsMounting(false), 150);
        return () => clearTimeout(timer);
    }, [filename]);

    // Force focus when mounting
    useEffect(() => {
        refocus();
        const interval = setInterval(refocus, 2000);
        return () => clearInterval(interval);
    }, [refocus]);

    // -- Dynamic Styles --
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
        },
        tutorOverlay: {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
            padding: 10,
            zIndex: 100,
            borderBottomWidth: 1,
            borderColor: colors.primary
        }
    });

    // -- Token Color Mapper --
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

    // -- State Aliases --
    const state = inputController.state;
    const commandInput = inputController.commandInput;

    // -- Line Renderer --
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

    // -- Render Sections --
    const topContent = (
        <View style={dynamicStyles.editorContainer}>
            {tutorState.active && (
                <View style={dynamicStyles.tutorOverlay}>
                    <Text style={{ color: colors.primary, fontWeight: 'bold' }}>TUTOR PROTOCOL ACTIVE</Text>
                    <Text style={{ color: colors.text.primary, fontFamily: settings.fontFamily }}>
                        TARGET: <Text style={{ color: colors.secondary }}>{tutorState.completed}</Text>
                        <Text style={{ color: colors.text.dim }}>{tutorState.text}</Text>
                    </Text>
                </View>
            )}

            {isMounting && <View style={dynamicStyles.crtBlinkOverlay} />}
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

    const middleContent = <VirtualKeyboard onKeyPress={inputController.handleVirtualKey} />;

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
                        <Pressable key={k} style={dynamicStyles.hintButton} onPress={() => inputController.handleVirtualKey(k)}>
                            <Text style={dynamicStyles.hintText}>[{k.toUpperCase()}]</Text>
                        </Pressable>
                    ))}
                </View>
            )}
        </View>
    );

    return { topContent, middleContent, bottomContent };
};
