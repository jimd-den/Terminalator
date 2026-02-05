import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { THEME } from '../Theme';
import { TutorMessage } from '../../../domain/entities/tutor/TutorMessage';

interface TutorBarProps {
    message: TutorMessage | null;
}

/**
 * TutorBar - Frameworks/Drivers Layer
 * 
 * A persistent IRC-style communication bar for the Tutor.
 * Positioned above the keyboard or at the bottom of the screen.
 * 
 * Style: Cold Kawaii / 80's Mainframe.
 * Now follows the active theme.
 */
export const TutorBar: React.FC<TutorBarProps> = ({ message }) => {
    const { theme } = useTheme();
    const colors = theme.colors;

    if (!message) return null;

    const hintColor = theme.id === 'matrix' ? '#FFB7C5' : colors.secondary;

    const typeStyle = message.type === 'hint' ? { color: hintColor } : 
                      message.type === 'warn' ? { color: colors.secondary } :
                      message.type === 'critical' ? { color: colors.error, fontWeight: 'bold' as const } : 
                      { color: colors.text.primary };

    const dynamicStyles = StyleSheet.create({
        container: {
            backgroundColor: colors.surface, // Use theme surface color
            borderBottomWidth: 2, // Thicker border
            borderBottomColor: colors.primary, // Use theme primary color
            padding: THEME.spacing.sm,
            minHeight: 70, // Even taller
            width: '100%',
            zIndex: 10, // Ensure it's on top
        },
        header: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: THEME.spacing.xs,
        },
        sender: {
            fontFamily: THEME.typography.fontFamily,
            fontSize: THEME.typography.fontSize.sm,
            color: colors.secondary,
            fontWeight: 'bold',
        },
        timestamp: {
            fontFamily: THEME.typography.fontFamily,
            fontSize: THEME.typography.fontSize.sm,
            color: colors.text.dim,
        },
        text: {
            fontFamily: THEME.typography.fontFamily,
            fontSize: THEME.typography.fontSize.md,
            color: colors.text.primary,
        },
    });

    return (
        <View style={dynamicStyles.container}>
            <View style={dynamicStyles.header}>
                <Text style={dynamicStyles.sender}>[{message.sender || 'SYSTEM'}]</Text>
                <Text style={dynamicStyles.timestamp}>
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
            </View>
            <Text style={[dynamicStyles.text, typeStyle]}>
                {message.text} {message.type === 'hint' ? '(◕‿◕✿)' : ''}
            </Text>
        </View>
    );
};
