/**
 * MissionHeader - Presentation Layer
 *
 * Displays the high-level mission context in a "MU-TH-UR 6000" mainframe style.
 * Uses ASCII box-drawing characters for borders and layout.
 *
 * Pillar: The Storyteller’s Code (Atmospherics)
 * Pillar: The Balanced Scale (Pure Component)
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { THEME } from '../Theme';
import { Mission, MissionStep } from '../../../domain/entities/Mission';

interface MissionHeaderProps {
    activeMission?: Mission;
    stationName: string;
    connectionStatus: 'CONNECTED' | 'DISCONNECTED' | 'SCANNING' | 'OFFLINE';
}

const ProgressBar = ({ progress, width = 10 }: { progress: number; width?: number }) => {
    const filled = Math.floor(progress * width);
    const empty = width - filled;
    return `[${'|'.repeat(filled)}${' '.repeat(empty)}]`;
};

export const MissionHeader: React.FC<MissionHeaderProps> = ({
    activeMission,
    stationName,
    connectionStatus
}) => {
    const { theme, settings } = useTheme();
    const colors = theme.colors;

    const styles = StyleSheet.create({
        container: {
            marginBottom: THEME.spacing.xs,
        },
        text: {
            color: colors.primary,
            fontFamily: settings.fontFamily,
            fontSize: THEME.typography.fontSize.sm, // Slightly smaller for dense info
            lineHeight: THEME.typography.fontSize.sm * 1.2,
        },
        dimText: {
            color: colors.text.dim,
            fontFamily: settings.fontFamily,
            fontSize: THEME.typography.fontSize.sm,
            lineHeight: THEME.typography.fontSize.sm * 1.2,
        },
        alert: {
            color: colors.error,
            fontFamily: settings.fontFamily,
            fontSize: THEME.typography.fontSize.sm,
            fontWeight: 'bold',
        }
    });

    // Helper to pad text to fixed length
    const pad = (text: string, length: number) => {
        return text.padEnd(length).substring(0, length);
    };

    const missionName = activeMission ? activeMission.description.split('.')[0] : 'IDLE / SYSTEM MONITOR';
    const objective = activeMission ? activeMission.objectiveTarget : 'AWAITING INPUT';

    // Calculate progress based on step? 
    // Simplified for now: 
    // PENDING = 0%, CONNECTED = 25%, LOCATED = 50%, COMPLETED = 100%
    const progressMap = {
        [MissionStep.PENDING]: 0.1,
        [MissionStep.CONNECTED]: 0.4,
        [MissionStep.LOCATED]: 0.7,
        [MissionStep.COMPLETED]: 1.0
    };
    const progressVal = activeMission ? progressMap[activeMission.currentStep] : 0;
    const progressStr = ProgressBar({ progress: progressVal });

    // Header Layout: 
    // ╔════════════════════════════════════════╗
    // ║ STATION: [NAME]        // STATUS: [OK] ║
    // ║ MISSION: [OBJECTIVE]   // PROG: [||| ] ║
    // ╚════════════════════════════════════════╝

    // Responsive width calculation logic would go here in a real terminal, 
    // but on mobile we rely on the monospaced font wrapping or fixed lines.
    // For now, we render line-by-line using Views to ensure alignment or just Text block.

    // Using simple Text block with box drawing characters.

    const borderColor = activeMission ? colors.primary : colors.text.dim;
    const borderStyle = { color: borderColor, fontFamily: settings.fontFamily };

    return (
        <View style={styles.container}>
            <Text style={borderStyle}>╔════════════════════════════════════════════╗</Text>

            <View style={{ flexDirection: 'row' }}>
                <Text style={borderStyle}>║ </Text>
                <Text style={styles.text}>STATION: {pad(stationName, 12)}</Text>
                <Text style={styles.dimText}> // </Text>
                <Text style={styles.text}>STATUS: [{connectionStatus}]</Text>
                <View style={{ flex: 1 }} />
                <Text style={borderStyle}>║</Text>
            </View>

            <View style={{ flexDirection: 'row' }}>
                <Text style={borderStyle}>║ </Text>
                <Text style={styles.text}>MISSION: {pad(missionName, 12)}</Text>
                <Text style={styles.dimText}> // </Text>
                <Text style={styles.text}>PROG: {progressStr}</Text>
                <View style={{ flex: 1 }} />
                <Text style={borderStyle}>║</Text>
            </View>

            <Text style={borderStyle}>╚════════════════════════════════════════════╝</Text>
        </View>
    );
};
