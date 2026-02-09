import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useProcess } from '../context/ProcessProvider';
import { GameEventType } from '../../../domain/services/SimulationBus';
import { ZincFormatter } from '../../../domain/utils/ZincFormatter';

export const EconomyBar: React.FC = () => {
    const { theme, settings } = useTheme();
    const { bus } = useProcess();
    const [balance, setBalance] = useState(0);
    const [hashRate, setHashRate] = useState(0);

    useEffect(() => {
        const unsub = bus.subscribe(GameEventType.ECONOMY_UPDATE, (event) => {
            setBalance(event.payload.balance);
            setHashRate(event.payload.hashRate);
        });
        return () => unsub();
    }, [bus]);

    const formatted = ZincFormatter.format(balance);

    const dynamicStyles = StyleSheet.create({
        container: {
            flexDirection: 'row',
            paddingVertical: 4,
            paddingHorizontal: 12,
            borderTopWidth: 1,
            backgroundColor: theme.colors.background,
            justifyContent: 'space-between',
        },
        section: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
        },
        label: {
            fontSize: 10,
            fontWeight: 'bold',
            letterSpacing: 1,
        },
        value: {
            fontSize: 12,
            fontWeight: 'bold',
        }
    });

    return (
        <View style={[dynamicStyles.container, { borderTopColor: theme.colors.border }]}>
            <View style={dynamicStyles.section}>
                <Text style={[dynamicStyles.label, { color: theme.colors.text.dim, fontFamily: settings.fontFamily }]}>
                    WALLET
                </Text>
                <Text style={[dynamicStyles.value, { color: theme.colors.secondary, fontFamily: settings.fontFamily }]}>
                    {formatted.value} <Text style={{ fontSize: 10 }}>{formatted.unit}</Text>
                </Text>
            </View>
            <View style={dynamicStyles.section}>
                <Text style={[dynamicStyles.label, { color: theme.colors.text.dim, fontFamily: settings.fontFamily }]}>
                    HASHRATE
                </Text>
                <Text style={[dynamicStyles.value, { color: theme.colors.primary, fontFamily: settings.fontFamily }]}>
                    {hashRate.toFixed(2)} H/s
                </Text>
            </View>
        </View>
    );
};

// Remove static styles