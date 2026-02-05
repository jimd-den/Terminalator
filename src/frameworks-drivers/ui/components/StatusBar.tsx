/**
 * StatusBar Component - Frameworks/Drivers Layer
 * 
 * Displays system vitals at the top of the terminal.
 * Follows the "Inverted Video" style of 80s status lines.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useGame } from '../context/GameContext';
import { THEME } from '../Theme';

interface StatusBarProps {
    status?: string;
    user?: string;
    connectionStatus?: string;
    activeMissionName?: string | null;
}

export const StatusBar: React.FC<StatusBarProps> = ({
    status = "OPERATIONAL",
    user = "OPERATOR",
    connectionStatus = "CONNECTED",
    activeMissionName
}) => {
    const { theme, settings } = useTheme();
    const { credits } = useGame();
    const colors = theme.colors;

    const styles = StyleSheet.create({
        container: {
            flexDirection: 'row',
            justifyContent: 'center', // [MOBILE-CENTRIC] Aligned to center for focal point
            alignItems: 'center',
            flexWrap: 'wrap', // Allow wrapping if fonts are very large
            backgroundColor: colors.primary,
            paddingHorizontal: THEME.spacing.md,
            paddingVertical: THEME.spacing.sm,
            borderBottomWidth: 1,
            borderBottomColor: colors.primary,
            gap: 16, // Spacing between groups
        },
        section: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
        },
        label: {
            color: colors.background,
            fontFamily: settings.fontFamily,
            fontSize: 10, // Slightly smaller for dense technical look
            fontWeight: 'bold',
        },
        creditLabel: {
            color: colors.background,
            backgroundColor: colors.secondary,
            fontFamily: settings.fontFamily,
            fontSize: 10,
            fontWeight: 'bold',
            paddingHorizontal: 6,
            paddingVertical: 1,
        }
    });

    // Formatting helpers
    const formatValue = (label: string, value: string) => `[ ${label}: ${value.toUpperCase()} ]`;

    return (
        <View style={styles.container}>
            <View style={styles.section}>
                {activeMissionName ? (
                    <Text style={styles.label}>{formatValue('MSN', activeMissionName)}</Text>
                ) : (
                    <Text style={styles.label}>{formatValue('SYS', status)}</Text>
                )}
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>{formatValue('NET', connectionStatus)}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>{formatValue('USR', user)}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.creditLabel}>
                    {formatValue('CR', credits.toString())}
                </Text>
            </View>
        </View>
    );
};
