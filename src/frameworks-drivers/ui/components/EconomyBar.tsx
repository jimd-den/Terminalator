/**
 * EconomyBar - Presentation Layer
 * 
 * A dedicated, centered bar for Economy metrics (ZINC and Hashrate).
 * Decoupled from the system status vitals.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useGame } from '../context/GameContext';
import { THEME } from '../Theme';
import { HashRateMonitor } from './HashRateMonitor';

export const EconomyBar: React.FC = () => {
    const { theme, settings } = useTheme();
    const { zincBalance } = useGame();
    const colors = theme.colors;

    const styles = StyleSheet.create({
        container: {
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#000', // Black background for separation
            paddingVertical: 6,
            borderBottomWidth: 1,
            borderBottomColor: 'rgba(0, 255, 65, 0.2)', // Subtle border
            gap: 20,
        },
        section: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        creditLabel: {
            color: '#000',
            backgroundColor: colors.secondary,
            fontFamily: settings.fontFamily,
            fontSize: 14,
            fontWeight: 'bold',
            paddingHorizontal: 10,
            paddingVertical: 2,
        }
    });

    return (
        <View style={styles.container}>
            <View style={styles.section}>
                <Text style={styles.creditLabel}>
                    Ƶ {zincBalance.toFixed(12)}
                </Text>
            </View>

            <HashRateMonitor />
        </View>
    );
};
