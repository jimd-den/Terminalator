import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { THEME } from '../Theme';
import { TutorMessage } from '../../../domain/entities/tutor/TutorMessage';
import { useTutorAnimation } from '../hooks/useTutorAnimation';
import { TypingIndicator } from './TypingIndicator';
import { useGame } from '../context/GameContext';
import { GhostWriter } from '../GhostWriter';

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
 * Now follows the active theme and animates based on message severity.
 */
export const TutorBar: React.FC<TutorBarProps> = ({ message }) => {
    const { theme } = useTheme();
    const { isTutorTyping } = useGame();
    const colors = theme.colors;
    const { transform, opacity } = useTutorAnimation(message);

    if (!message && !isTutorTyping) return null;

    const hintColor = theme.id === 'matrix' ? '#FFB7C5' : colors.secondary;

    const typeStyle = message?.type === 'hint' ? { color: hintColor } : 
                      message?.type === 'warn' ? { color: colors.secondary } :
                      message?.type === 'critical' ? { color: colors.error, fontWeight: 'bold' as const } : 
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

    const fullText = message ? `${message.text}${message.type === 'hint' ? ' (◕‿◕✿)' : ''}` : '';

    return (
        <Animated.View style={[dynamicStyles.container, { transform, opacity }]}>
            <View style={dynamicStyles.header}>
                <Text style={dynamicStyles.sender}>[TUTOR]</Text>
                {isTutorTyping && <TypingIndicator />}
                {message && !isTutorTyping && (
                    <Text style={dynamicStyles.timestamp}>
                        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                )}
            </View>
            {!isTutorTyping && message && (
                <GhostWriter 
                    text={fullText}
                    speed={25}
                    style={[dynamicStyles.text, typeStyle]}
                />
            )}
        </Animated.View>
    );
};
