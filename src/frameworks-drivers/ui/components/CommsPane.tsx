import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Dimensions } from 'react-native';
import { MissionDTO } from '../../../domain/dtos/MissionDTO';
import { THEME } from '../Theme';
import { useTheme } from '../context/ThemeContext';
import { GhostWriter } from '../GhostWriter';

interface CommsPaneProps {
    missions: MissionDTO[];
    activeMissionId: string | null;
    onMissionSelect: (id: string | null) => void;
    onStartMission: (id: string) => void;
    onAbandonMission: (id: string) => void;
}

export const CommsPane: React.FC<CommsPaneProps> = ({
    missions,
    activeMissionId,
    onMissionSelect,
    onStartMission,
    onAbandonMission
}) => {
    const { theme, settings } = useTheme();
    const colors = theme.colors;

    // Auto-select first mission if none selected
    useEffect(() => {
        if (!activeMissionId && missions.length > 0) {
            onMissionSelect(missions[0].id);
        }
    }, [activeMissionId, missions, onMissionSelect]);

    const activeMission = missions.find(m => m.id === activeMissionId);

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
            padding: THEME.spacing.md,
        },
        // Frequency/Channel Header
        channelBar: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            marginBottom: THEME.spacing.md,
            borderBottomWidth: 1,
            borderBottomColor: colors.primary,
            paddingBottom: THEME.spacing.sm,
            gap: 12,
        },
        channelTab: {
            opacity: 0.5,
        },
        activeChannelTab: {
            opacity: 1,
            backgroundColor: colors.primary,
        },
        channelText: {
            color: colors.primary,
            fontFamily: settings.fontFamily,
            fontSize: 14,
            fontWeight: 'bold',
            paddingHorizontal: 4,
        },
        activeChannelText: {
            color: colors.background,
        },

        // Message Stream
        streamContainer: {
            flex: 1,
            marginBottom: THEME.spacing.md,
        },
        messageBlock: {
            marginBottom: THEME.spacing.md,
            borderLeftWidth: 2,
            borderLeftColor: colors.border,
            paddingLeft: THEME.spacing.sm,
        },
        headerRow: {
            flexDirection: 'row',
            marginBottom: 4,
        },
        senderLabel: {
            color: colors.primary,
            fontFamily: settings.fontFamily,
            fontSize: 12,
            fontWeight: 'bold',
            marginRight: 8,
        },
        timestampLabel: {
            color: colors.text.dim,
            fontFamily: settings.fontFamily,
            fontSize: 12,
        },
        messageBody: {
            color: colors.text.primary,
            fontFamily: settings.fontFamily,
            fontSize: 14,
            lineHeight: 20,
        },

        // Big Buttons - Compact Block Style
        actionRow: {
            marginTop: 'auto',
            gap: 8, // Reduced gap
        },
        bigButton: {
            backgroundColor: colors.primary,
            paddingVertical: 10, // Reduced from 16 to 10
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1, // Thinner border
            borderColor: colors.primary,
        },
        declineButton: {
            backgroundColor: 'transparent',
            borderColor: colors.error,
            paddingVertical: 10, // Reduced from 16 to 10
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
        },
        buttonText: {
            color: colors.background,
            fontFamily: settings.fontFamily,
            fontSize: 14, // Reduced from 18 to 14
            fontWeight: 'bold',
            letterSpacing: 1,
        },
        declineText: {
            color: colors.error,
            fontFamily: settings.fontFamily,
            fontSize: 14, // Reduced from 18 to 14
            fontWeight: 'bold',
            letterSpacing: 1,
        }
    });

    // If no missions, show empty state
    if (missions.length === 0) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: colors.text.dim, fontFamily: settings.fontFamily }}>NO ACTIVE TRANSMISSIONS</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* 1. Channel Selector (Top Bar) */}
            <View style={styles.channelBar}>
                <Text style={[styles.channelText, { opacity: 1, paddingLeft: 0 }]}>FREQ:</Text>
                {missions.map(m => {
                    const isActive = m.id === activeMissionId;
                    return (
                        <Pressable
                            key={m.id}
                            onPress={() => onMissionSelect(m.id)}
                            style={[styles.channelTab, isActive && styles.activeChannelTab]}
                        >
                            <Text style={[styles.channelText, isActive && styles.activeChannelText]}>
                                [{m.assignerName.toUpperCase()}]
                            </Text>
                        </Pressable>
                    );
                })}
            </View>

            {/* 2. Message Content */}
            {activeMission ? (
                <>
                    <ScrollView style={styles.streamContainer}>
                        {activeMission.chatHistory.map((msg, i) => (
                            <View key={i} style={styles.messageBlock}>
                                <View style={styles.headerRow}>
                                    <Text style={styles.senderLabel}>FROM: {msg.sender.toUpperCase()}</Text>
                                    <Text style={styles.timestampLabel}>// IDX-{i.toString().padStart(3, '0')}</Text>
                                </View>
                                <Text style={styles.messageBody}>{msg.message}</Text>
                            </View>
                        ))}
                    </ScrollView>

                    {/* 3. Big Action Buttons */}
                    <View style={styles.actionRow}>
                        {activeMission.status === 'pending' && (
                            <>
                                <Pressable
                                    style={styles.bigButton}
                                    onPress={() => onStartMission(activeMission.id)}
                                >
                                    <Text style={styles.buttonText}>[ ACCEPT MISSION ]</Text>
                                </Pressable>

                                <Pressable
                                    style={styles.declineButton}
                                    onPress={() => onAbandonMission(activeMission.id)}
                                >
                                    <Text style={styles.declineText}>[ DECLINE ]</Text>
                                </Pressable>
                            </>
                        )}

                        {activeMission.status === 'active' && (
                            <Pressable
                                style={styles.declineButton}
                                onPress={() => onAbandonMission(activeMission.id)}
                            >
                                <Text style={styles.declineText}>[ ABORT ]</Text>
                            </Pressable>
                        )}
                    </View>
                </>
            ) : (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: colors.text.dim, fontFamily: settings.fontFamily }}>SELECT FREQUENCY</Text>
                </View>
            )}
        </View>
    );
};
