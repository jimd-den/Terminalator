/**
 * InputBar - Presentation Layer
 *
 * Visualizes the current input buffer, cursor, and ghost text.
 *
 * Pillar: THE UNIVERSAL INTERFACE (Headless Rendering)
 * Pillar: THE FOUR-FOLD SHIELD (Interface Adapter)
 * Pillar: THE BALANCED SCALE (SRP)
 */

import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { THEME } from '../Theme';
import { TutorEmotion } from '../../../domain/entities/TutorEngine';
import { PopChar } from './PopChar';

interface InputBarProps {
    input: string;
    ghostText: string;
    user: string;
    hostname: string;
    tutorEmotion: TutorEmotion;
    crashingIndices: number[];
    onRefocus: () => void;
}

export const InputBar: React.FC<InputBarProps> = ({
    input,
    ghostText,
    user,
    hostname,
    tutorEmotion,
    crashingIndices,
    onRefocus
}) => {
    const { theme, settings, components } = useTheme();
    const { TextRenderer, Cursor } = components;
    const colors = theme.colors;

    /**
     * Generator for Phosphorus Input Aesthetics.
     * Pure function to create themed styles for the input area.
     */
    const createInputStyles = (colors: any, settings: any) => StyleSheet.create({
        inputWrapper: {
            width: '100%',
            flexDirection: 'column',
        },
        inputLabelStyle: {
            marginBottom: THEME.spacing.xs,
            opacity: 0.6,
            letterSpacing: 2,
        },
        inputContainer: {
            width: '100%',
            position: 'relative',
            justifyContent: 'center',
        },
        inputRow: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'center'
        },
        inputCharStyle: {
            color: colors.text.primary,
            fontFamily: settings.fontFamily,
            fontSize: THEME.typography.fontSize.lg,
        },
        ghostTextStyle: {
            opacity: 0.5,
        },
    });

    const styles = React.useMemo(() => createInputStyles(colors, settings), [colors, settings]);

    return (
        <View style={styles.inputWrapper}>
            <TextRenderer
                type="primary"
                style={styles.inputLabelStyle}
                content={`INPUT // ${user}@${hostname || 'system'}`}
            />
            <Pressable style={styles.inputContainer} onPress={onRefocus}>
                <View style={styles.inputRow}>
                    {input.split('').map((char, index) => (
                        <PopChar
                            key={`${index}-${char}`}
                            style={styles.inputCharStyle}
                            isCrashing={crashingIndices.includes(index)}
                        >
                            {char}
                        </PopChar>
                    ))}
                    <Cursor
                        active={true}
                        color={colors.primary}
                        metadata={{ emotion: tutorEmotion }}
                    />
                    <TextRenderer
                        content={ghostText}
                        type="dim"
                        style={[styles.inputCharStyle, styles.ghostTextStyle]}
                    />
                </View>
            </Pressable>
        </View>
    );
};