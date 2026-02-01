/**
 * InputBar - Presentation Layer
 *
 * Visualizes the current input buffer, cursor, and ghost text.
 *
 * Pillar: The Four-Fold Shield (Interface Adapter)
 * Pillar: The Balanced Scale (SRP)
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { THEME } from '../Theme';
import { TutorEmotion } from '../../../domain/entities/TutorEngine';
import { PopChar } from './PopChar';
import { Cursor } from './Cursor';

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
    const { theme, settings } = useTheme();
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
        inputLabel: {
            color: colors.primary,
            fontFamily: settings.fontFamily,
            fontSize: THEME.typography.fontSize.sm,
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
        inputChar: {
            color: colors.text.primary,
            fontFamily: settings.fontFamily,
            fontSize: THEME.typography.fontSize.lg,
            height: 35,
            lineHeight: 35,
        },
        ghostText: {
            color: colors.text.dim,
            fontFamily: settings.fontFamily,
            fontSize: THEME.typography.fontSize.lg,
            height: 35,
            lineHeight: 35,
            opacity: 0.5,
        },
    });

    const styles = React.useMemo(() => createInputStyles(colors, settings), [colors, settings]);

    return (
        <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>
                INPUT // {user}@{hostname || 'system'}
            </Text>
            <Pressable style={styles.inputContainer} onPress={onRefocus}>
                <View style={styles.inputRow}>
                    {input.split('').map((char, index) => (
                        <PopChar
                            key={`${index}-${char}`}
                            style={styles.inputChar}
                            isCrashing={crashingIndices.includes(index)}
                        >
                            {char}
                        </PopChar>
                    ))}
                    <Cursor
                        color={colors.primary}
                        inputTrigger={input.length}
                        emotion={tutorEmotion}
                    />
                    <Text style={[styles.inputChar, styles.ghostText]}>{ghostText}</Text>
                </View>
            </Pressable>
        </View>
    );
};
