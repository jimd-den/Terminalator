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

    const styles = StyleSheet.create({
        inputWrapper: {
            width: '100%',
            flexDirection: 'column',
        },
        inputLabel: {
            color: colors.secondary,
            fontFamily: settings.fontFamily,
            fontSize: THEME.typography.fontSize.sm,
            marginBottom: THEME.spacing.xs,
            opacity: 0.8,
            letterSpacing: 1,
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
            color: colors.text.dim, // Distinct ghost color
            fontFamily: settings.fontFamily,
            fontSize: THEME.typography.fontSize.lg,
            height: 35,
            lineHeight: 35,
        },
    });

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
