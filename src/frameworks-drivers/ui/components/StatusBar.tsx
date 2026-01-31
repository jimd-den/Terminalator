/**
 * StatusBar Component - Frameworks/Drivers Layer
 * 
 * Displays system vitals at the top of the terminal.
 * Follows the "Inverted Video" style of 80s status lines.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
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
    const colors = theme.colors;

    const styles = StyleSheet.create({
        container: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: colors.primary, // Inverted by default
            paddingHorizontal: THEME.spacing.sm,
            paddingVertical: 4,
            borderBottomWidth: 1,
            borderBottomColor: colors.primary,
        },
        section: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
        },
        label: {
            color: colors.background, // Dark text on bright background
            fontFamily: settings.fontFamily,
            fontSize: 12, // Small, crisp font
            fontWeight: 'bold',
        },
        value: {
            color: colors.background,
            fontFamily: settings.fontFamily,
            fontSize: 12,
            fontWeight: 'bold',
        }
    });

    // Formatting helpers
    const formatUser = (u: string) => `[ USER: ${u.toUpperCase()} ]`;
    const formatNet = (n: string) => `[ NET: ${n} ]`;
    const formatMission = (m: string) => `[ MSN: ${m} ]`;

    // Responsive: If mission is active, maybe hide SYS status to fit?
    // Or just show NET and MSN and USER.
    const showSys = !activeMissionName;

    return (
        <View style={styles.container}>
            <View style={styles.section}>
                {showSys && <Text style={styles.label}>[ SYS: {status} ]</Text>}
                {activeMissionName && <Text style={styles.label}>{formatMission(activeMissionName)}</Text>}
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>{formatNet(connectionStatus)}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>{formatUser(user)}</Text>
            </View>
        </View>
    );
};
