/**
 * ContextHint - Presentation Layer
 *
 * Displays a contextual hint message when the user is idle.
 * Designed to look like a high-priority system overlay or bureaucratic advice.
 *
 * Pillar: The Storyteller’s Code (Atmospherics)
 * Pillar: The Balanced Scale (Pure Component)
 */

import React from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { THEME } from '../Theme';

interface ContextHintProps {
    text: string | null;
}

export const ContextHint: React.FC<ContextHintProps> = ({ text }) => {
    const { theme, settings } = useTheme();
    const colors = theme.colors;

    if (!text) return null;

    const styles = StyleSheet.create({
        container: {
            paddingBottom: THEME.spacing.sm,
            opacity: 0.8,
        },
        text: {
            color: colors.secondary,
            fontFamily: settings.fontFamily,
            fontSize: THEME.typography.fontSize.sm,
            fontStyle: 'italic',
        }
    });

    return (
        <View style={styles.container}>
            <Text style={styles.text}>{text}</Text>
        </View>
    );
};
