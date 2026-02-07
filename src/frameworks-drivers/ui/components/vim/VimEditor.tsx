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
 * Renders the state provided by the Headless ViewModel.
 * Decoupled from logic, purely focused on pixel-perfect rendering.
 */

import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useInput } from '../../context/InputContext';
import { THEME } from '../../Theme';
import { useGame } from '../../context/GameContext';
import { VirtualKeyboard } from '../VirtualKeyboard';
import { useTheme, useThemeComponents } from '../../context/ThemeContext';
import { FileSystemService } from '../../../../domain/services/FileSystemService';

// Import Headless ViewModel
import { useHeadlessVim } from '../../../../interface-adapters/viewmodels/useHeadlessVim';

interface VimEditorProps {
    filename: string;
    onExit: () => void;
}

export const useVimEditor = (filename: string, onExit: () => void) => {
    const { fs, gameManager, isInputLocked, tutorShadow } = useGame();
    const { theme, settings } = useTheme();
    const components = useThemeComponents();
    const { TextRenderer, Cursor } = components;
    const colors = theme.colors;

    // -- Domain Services --
    // We instantiate the service here to pass into the ViewModel
    // Ideally this would come from a DI container, but for now we follow the existing pattern.
    const fsService = useMemo(() => new FileSystemService(fs), [fs]);

    // -- Headless Logic --
    // All editor state and logic is now managed by this hook.
    // This component is merely a renderer.
    const headless = useHeadlessVim(filename, fsService, gameManager.tutorEngine, tutorShadow, onExit);

    // -- Mount State (Visual Only) --
    const [isMounting, setIsMounting] = React.useState(true);

    // -- Input Context Wiring --
    const { setOnInput, setOnKeyPress, refocus } = useInput();

    React.useEffect(() => {
        setOnInput((text) => {
            if (isInputLocked) return;
            for (const char of text) {
                if (char === '\n') headless.handleVirtualKey('ENTER');
                else headless.handleVirtualKey(char);
            }
        });
        setOnKeyPress((key) => {
            if (isInputLocked) return;
            headless.handleVirtualKey(key);
        });
    }, [headless.handleVirtualKey, setOnInput, setOnKeyPress]);

    // -- Initialization (Visual Effects) --
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
            fontWeight: 'bold',
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
    // We alias the headless state to match the structure the renderer expects.
    const state = headless;
    const commandInput = headless.commandInput;
    const tutorState = headless.tutor;
    const highlighter = headless.highlighter;

    // -- Line Renderer --
    const renderLine = (lineContent: string, lineIdx: number) => {
        const isCurrentLine = lineIdx === state.cursor.line;
        const lineError = state.lintErrors.find(e => e.line === lineIdx + 1);
        const tokens = highlighter.highlight(lineContent);
        let cursorRendered = false;

        return (
            <View key={lineIdx} style={[dynamicStyles.lineWrapper, lineError && dynamicStyles.errorLine]}>
                <View style={{ flexDirection: 'row' }}>
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
                                    <React.Fragment key={tokenIdx}>
                                        <TextRenderer content={head} style={{ color: tokenColor }} />
                                        {state.mode === 'INSERT' && (
                                            <Cursor active={true} color={colors.primary} type="line" />
                                        )}
                                        <TextRenderer 
                                            content={char} 
                                            style={state.mode === 'NORMAL' ? { backgroundColor: colors.primary, color: colors.background } : { color: tokenColor }} 
                                        />
                                        <TextRenderer content={tail} style={{ color: tokenColor }} />
                                    </React.Fragment>
                                );
                            }
                        }
                        return <TextRenderer key={tokenIdx} content={token.text} style={{ color: tokenColor }} />;
                    })}
                    {isCurrentLine && !cursorRendered && (
                        <Cursor 
                            active={true} 
                            color={colors.primary} 
                            type={state.mode === 'INSERT' ? 'line' : 'block'} 
                        />
                    )}
                </View>
            </View>
        );
    };

    // -- Render Sections --
    const topContent = (
        <View style={dynamicStyles.editorContainer}>
            {tutorState.active && (
                <View style={dynamicStyles.tutorOverlay}>
                    <TextRenderer style={{ fontWeight: 'bold' }} content="TUTOR PROTOCOL ACTIVE" />
                    <View style={{ flexDirection: 'row' }}>
                        <TextRenderer content="TARGET: " />
                        <TextRenderer type="secondary" content={tutorState.completed} />
                        <TextRenderer type="dim" content={tutorState.text} />
                    </View>
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
                <TextRenderer 
                    style={[dynamicStyles.statusText, !!state.lintErrors.find(e => e.line === state.cursor.line + 1) && dynamicStyles.errorStatusText]}
                    content={state.lintErrors.find(e => e.line === state.cursor.line + 1)?.message || (state.statusMessage || (state.mode === 'NORMAL' ? '-- NORMAL --' : `-- ${state.mode} --`))}
                />
                <TextRenderer 
                    style={dynamicStyles.statusText}
                    content={`${highlighter.language.toUpperCase()} | Ln ${state.cursor.line + 1}, Col ${state.cursor.col + 1}`}
                />
            </View>
        </View>
    );

    const middleContent = <VirtualKeyboard onKeyPress={headless.handleVirtualKey} />;

    const bottomContent = (
        <View style={dynamicStyles.footer}>
            {state.mode === 'COMMAND' ? (
                <View style={dynamicStyles.commandRow}>
                    <TextRenderer style={dynamicStyles.commandText} content={commandInput} />
                    <Cursor active={true} color={colors.primary} />
                </View>
            ) : (
                <View style={dynamicStyles.buttonRow}>
                    {['i', ':', 'ESC', 'h', 'j', 'k', 'l'].map(k => (
                        <Pressable key={k} style={dynamicStyles.hintButton} onPress={() => headless.handleVirtualKey(k)}>
                            <TextRenderer style={dynamicStyles.hintText} content={`[${k.toUpperCase()}]`} />
                        </Pressable>
                    ))}
                </View>
            )}
        </View>
    );

    return { topContent, middleContent, bottomContent };
};
