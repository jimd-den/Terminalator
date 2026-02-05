import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
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
 */
export const TutorBar: React.FC<TutorBarProps> = ({ message }) => {
    if (!message) return null;

    const typeStyle = message.type === 'hint' ? styles.hint : 
                      message.type === 'warn' ? styles.warn :
                      message.type === 'critical' ? styles.critical : styles.info;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.sender}>[{message.sender || 'SYSTEM'}]</Text>
                <Text style={styles.timestamp}>
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
            </View>
            <Text style={[styles.text, typeStyle]}>
                {message.text} {message.type === 'hint' ? '(◕‿◕✿)' : ''}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: THEME.colors.surface,
        borderTopWidth: THEME.borders.width,
        borderTopColor: THEME.colors.primary,
        padding: THEME.spacing.sm,
        minHeight: 50,
        width: '100%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: THEME.spacing.xs,
    },
    sender: {
        fontFamily: THEME.typography.fontFamily,
        fontSize: THEME.typography.fontSize.sm,
        color: THEME.colors.secondary,
        fontWeight: 'bold',
    },
    timestamp: {
        fontFamily: THEME.typography.fontFamily,
        fontSize: THEME.typography.fontSize.sm,
        color: THEME.colors.text.dim,
    },
    text: {
        fontFamily: THEME.typography.fontFamily,
        fontSize: THEME.typography.fontSize.md,
        color: THEME.colors.text.primary,
    },
    info: { color: THEME.colors.text.primary },
    warn: { color: THEME.colors.secondary },
    hint: { color: '#FFB7C5' }, // Soft Pastel Pink
    critical: { color: THEME.colors.error },
});
