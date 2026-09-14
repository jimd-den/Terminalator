/**
 * SystemBar - Frameworks/Drivers Layer
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * One Status Line Instead Of Two Bars
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * The console previously opened with two separate strips -- a centred chip row
 * (SYS/NET/USR) and a wallet/hashrate row -- which cost two borders, two sets of
 * vertical padding, and gave the eye no single place to look. On a phone that
 * is a meaningful slice of the screen spent on chrome.
 *
 * This merges them into one block, and adds what the old chrome could not show:
 * where you are standing in the lattice, and how much of it you have found.
 * Since the world is derived rather than stored there is no total to display --
 * the count is knowledge acquired, which is the honest number to show.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useProcess } from '../context/ProcessProvider';
import { GameEventType } from '../../../domain/services/SimulationBus';
import { ZincFormatter } from '../../../domain/utils/ZincFormatter';
import { CoreEngine } from '../../../core/CoreEngine';
import { THEME } from '../Theme';

interface SystemBarProps {
    status?: string;
    user?: string;
    connectionStatus?: string;
    activeMissionName?: string | null;
    /** Host the shell is currently standing on. */
    host?: string;
}

export const SystemBar: React.FC<SystemBarProps> = ({
    status = 'OPERATIONAL',
    user = 'OPERATOR',
    connectionStatus = 'CONNECTED',
    activeMissionName,
    host
}) => {
    const { theme, settings } = useTheme();
    const { bus } = useProcess();
    const colors = theme.colors;

    const engine = CoreEngine.getInstance();
    const economyService = engine.getEconomyService();

    const [balance, setBalance] = useState(() => economyService.getBalance());
    const [hashRate, setHashRate] = useState(() => economyService.getSession().hashRate);
    const [known, setKnown] = useState(0);

    useEffect(() => {
        const unsub = bus.subscribe(GameEventType.ECONOMY_UPDATE, (event) => {
            setBalance(event.payload.balance);
            setHashRate(event.payload.hashRate);
        });
        return () => unsub();
    }, [bus]);

    // The discovered-host count changes as a side effect of scanning rather than
    // through an event of its own, so it is sampled rather than subscribed to.
    useEffect(() => {
        const read = () => {
            try {
                setKnown(engine.getNetworkMap()?.getAllHosts().length ?? 0);
            } catch {
                setKnown(0);
            }
        };
        read();
        const timer = setInterval(read, 2000);
        return () => clearInterval(timer);
    }, [engine]);

    const wallet = ZincFormatter.format(balance);
    const location = (host && host.trim()) ? host : 'localhost';

    const styles = StyleSheet.create({
        wrap: {
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
        },
        primaryRow: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.primary,
            paddingVertical: 3,
            paddingHorizontal: THEME.spacing.md,
            gap: 12,
        },
        chip: {
            color: colors.background,
            fontFamily: settings.fontFamily,
            fontSize: 10,
            fontWeight: 'bold',
            letterSpacing: 0.5,
        },
        metaRow: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 4,
            paddingHorizontal: THEME.spacing.md,
            gap: 14,
        },
        label: {
            fontFamily: settings.fontFamily,
            fontSize: 9,
            fontWeight: 'bold',
            letterSpacing: 1,
            color: colors.text.dim,
        },
        value: {
            fontFamily: settings.fontFamily,
            fontSize: 11,
            fontWeight: 'bold',
        },
        spacer: { flex: 1 },
        // The location can be a long derived hostname, so it is the one field
        // allowed to shrink rather than push the numbers off-screen.
        locValue: {
            fontFamily: settings.fontFamily,
            fontSize: 11,
            fontWeight: 'bold',
            color: colors.secondary,
            flexShrink: 1,
        }
    });

    const chip = (label: string, value: string) => (
        <Text style={styles.chip} numberOfLines={1}>[ {label}: {value.toUpperCase()} ]</Text>
    );

    return (
        <View style={styles.wrap}>
            <View style={styles.primaryRow}>
                {activeMissionName ? chip('MSN', activeMissionName) : chip('SYS', status)}
                {chip('NET', connectionStatus)}
                <View style={styles.spacer} />
                {chip('USR', user)}
            </View>

            <View style={styles.metaRow}>
                <Text style={styles.label}>LOC</Text>
                <Text style={styles.locValue} numberOfLines={1}>{location}</Text>

                <View style={styles.spacer} />

                <Text style={styles.label}>NODES</Text>
                <Text style={[styles.value, { color: colors.primary }]}>{known}</Text>

                <Text style={styles.label}>ZINC</Text>
                <Text style={[styles.value, { color: colors.secondary }]}>
                    {wallet.value}
                    <Text style={{ fontSize: 9 }}> {wallet.unit}</Text>
                </Text>

                <Text style={styles.label}>H/s</Text>
                <Text style={[styles.value, { color: colors.primary }]}>{hashRate.toFixed(2)}</Text>
            </View>
        </View>
    );
};
