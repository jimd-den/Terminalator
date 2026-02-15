/**
 * HashRateMonitor - Presentation Layer
 * 
 * Visualizes the current mining performance and chain streaks.
 * Implements Phase V: The GRID Overlay (Mining Feedback).
 * 
 * Pillar: THE Swift Stream (Performance Monitoring)
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useEconomy } from '../context/EconomyProvider';
import { useProcess } from '../context/ProcessProvider';
import { THEME } from '../Theme';
import { useTheme } from '../context/ThemeContext';
import { GameEventType } from '../../../domain/services/SimulationBus';

export const HashRateMonitor: React.FC = () => {
    const { economyService } = useEconomy();
    const { bus } = useProcess();
    const { theme, settings } = useTheme();
    const colors = theme.colors;

    const [hashRate, setHashRate] = useState(1.0);
    const [streak, setStreak] = useState(0);

    useEffect(() => {
        // Initial state
        const session = economyService.getSession();
        setHashRate(session.hashRate);
        setStreak(session.streak);

        // Subscribe to updates
        const unsubscribe = bus.subscribe(GameEventType.ECONOMY_UPDATE, (event) => {
            setHashRate(event.payload.hashRate);
            setStreak(event.payload.streak);
        });
        
        return unsubscribe;
    }, [economyService, bus]);

    const isOverdrive = hashRate > 3.0;

    const dynamicStyles = StyleSheet.create({
        container: {
            flexDirection: 'row',
            paddingHorizontal: THEME.spacing.sm,
            paddingVertical: 2,
            backgroundColor: isOverdrive ? colors.secondary : colors.primary,
            alignItems: 'center',
        },
        label: {
            fontFamily: settings.fontFamily,
            fontSize: 10,
            color: colors.text.inverted,
            fontWeight: 'bold',
        },
        value: {
            fontSize: 14,
            color: colors.text.inverted,
            fontFamily: settings.fontFamily,
            fontWeight: 'bold',
        }
    });

    return (
        <View style={dynamicStyles.container}>
            <Text style={dynamicStyles.value}>
                <Text style={dynamicStyles.label}>Ƶ/hr: </Text>
                {hashRate.toFixed(2)}x
            </Text>
            {streak > 0 && (
                <Text style={dynamicStyles.label}>
                    {"  "}STREAK: {streak}
                </Text>
            )}
        </View>
    );
};
