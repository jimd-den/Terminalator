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

    return (
        <View style={[styles.container, { borderTopColor: theme.colors.border }]}>
            <View style={styles.section}>
                <Text style={[styles.label, { color: theme.colors.text.dim, fontFamily: settings.fontFamily }]}>
                    WALLET
                </Text>
                <Text style={[styles.value, { color: theme.colors.secondary, fontFamily: settings.fontFamily }]}>
                    {formatted.value} <Text style={{ fontSize: 10 }}>{formatted.unit}</Text>
                </Text>
            </View>
            <View style={styles.section}>
                <Text style={[styles.label, { color: theme.colors.text.dim, fontFamily: settings.fontFamily }]}>
                    HASHRATE
                </Text>
                <Text style={[styles.value, { color: theme.colors.primary, fontFamily: settings.fontFamily }]}>
                    {hashRate.toFixed(2)} H/s
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        paddingVertical: 4,
        paddingHorizontal: 12,
        borderTopWidth: 1,
        backgroundColor: '#000',
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