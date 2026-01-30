import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Dimensions, Platform } from 'react-native';
import { Mission } from '../../../domain/entities/Mission';
import { THEME } from '../Theme';
import { useTheme } from '../context/ThemeContext';
import { useInput } from '../context/InputContext';

interface IrcTabProps {
    missions: Mission[];
    onStartMission: (id: string) => void;
    onAbandonMission: (id: string) => void;
}

export const IrcTab: React.FC<IrcTabProps> = ({ missions, onStartMission, onAbandonMission }) => {
    const { theme, settings } = useTheme();
    const colors = theme.colors;
    const { refocus } = useInput();

    // Track which mission tab is active (open)
    const [activeMissionId, setActiveMissionId] = useState<string | null>(null);

    // Notification handling
    const [notification, setNotification] = useState<string | null>(null);
    const prevMissionsLength = useRef(missions.length);
    const prevTotalMessages = useRef(missions.reduce((acc, m) => acc + m.chatHistory.length, 0));

    useEffect(() => {
        // 1. New Mission Alert
        if (missions.length > prevMissionsLength.current) {
            const newMission = missions[missions.length - 1];
            setNotification(`[!] ${newMission.type.toUpperCase()}: ${newMission.description.substring(0, 30)}...`);
            const timer = setTimeout(() => setNotification(null), 5000);
            return () => clearTimeout(timer);
        }

        // 2. New Message Alert (Tutor/System)
        const totalMessages = missions.reduce((acc, m) => acc + m.chatHistory.length, 0);
        if (totalMessages > prevTotalMessages.current) {
            // Find which mission got updated
            const updatedMission = missions.find(m => {
                const prevM = prevTotalMessages.current; // heuristic, tough to know exact prev state without deep compare
                // Simplified: just show last message of active mission or first mission with new message
                return true;
            });

            // Just notify generic "INCOMING MESSAGE" or specific if we can track it.
            // For now, let's just checking if active mission got a message while closed?
            // Actually, if a message comes in, show it.
            const timer = setTimeout(() => setNotification("[!] INCOMING COMMS..."), 3000);
            // Better: Find the last message of the mission that changed.
        }

        // Simpler approach:
        const currentTotal = missions.reduce((acc, m) => acc + m.chatHistory.length, 0);
        if (currentTotal > prevTotalMessages.current) {
            setNotification("[!] NEW MESSAGE RECEIVED");
            const timer = setTimeout(() => setNotification(null), 4000);
            prevTotalMessages.current = currentTotal;
            return () => clearTimeout(timer);
        }

        prevMissionsLength.current = missions.length;
        prevTotalMessages.current = currentTotal;
    }, [missions]);

    const handleTabPress = (id: string) => {
        if (activeMissionId === id) {
            setActiveMissionId(null); // Close if already open
            setTimeout(refocus, 50); // Refocus terminal
        } else {
            setActiveMissionId(id);
            // Do not refocus, let user scroll chat
        }
    };

    const activeMission = missions.find(m => m.id === activeMissionId);

    // Responsive width calculation
    const { width } = Dimensions.get('window');

    const dynamicStyles = StyleSheet.create({
        container: {
            position: 'absolute',
            right: 0,
            top: 250, // [FIX] Start lower
            bottom: Platform.OS === 'web' ? 200 : 400, // [FIX] Web doesn't need huge keyboard clearance, but keep some space.
            zIndex: 1000,
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'flex-end',
        },
        tabColumn: {
            flexDirection: 'column',
            marginLeft: -1, // Overlap border
        },
        // ... (styles)
        tab: {
            backgroundColor: colors.background,
            borderColor: colors.primary,
            borderWidth: 1,
            borderRightWidth: 0,
            width: 40,
            height: 80, // [FIX] Shorter tabs
            marginBottom: 8,
            borderTopLeftRadius: 8,
            borderBottomLeftRadius: 8,
            alignItems: 'center',
            justifyContent: 'center',
        },
        activeTab: {
            backgroundColor: 'rgba(0,0,0,0.95)', // [FIX] Match panel background
            borderRightWidth: 0,
            borderLeftWidth: 0, // [FIX] Remove border between panel and tab
            zIndex: 10,
            width: 42,
        },
        tabTextContainer: {
            width: 80, // [FIX] Match tab height
            height: 40,
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ rotate: '-90deg' }],
        },
        tabText: {
            color: colors.text.dim,
            fontFamily: settings.fontFamily,
            fontSize: 12,
            fontWeight: 'bold',
        },
        activeTabText: {
            color: colors.primary,
        },
        panel: {
            width: Math.min(width * 0.5, 600), // Slightly wider
            minWidth: 300,
            maxHeight: '100%',
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.95)',
            borderColor: colors.primary,
            borderWidth: 1,
            padding: THEME.spacing.sm, // Compact padding
            marginRight: -1,
        },
        header: {
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            paddingBottom: 8,
            marginBottom: 8,
        },
        title: {
            color: colors.primary,
            fontFamily: settings.fontFamily,
            fontSize: settings.fontSize, // Match terminal font size
            fontWeight: 'bold',
        },
        subtitle: {
            color: colors.text.dim,
            fontFamily: settings.fontFamily,
            fontSize: settings.fontSize * 0.75, // Smaller subtitle
        },
        messageRow: {
            marginBottom: 2, // tighter
            flexDirection: 'column', // Stack sender/text
            alignItems: 'flex-start',
        },
        sender: {
            color: colors.secondary,
            fontWeight: 'bold',
            fontSize: 10, // Smaller sender
            marginBottom: 1,
        },
        systemSender: {
            color: colors.error, // Or warning color
        },
        messageText: {
            color: colors.text.primary,
            fontFamily: settings.fontFamily,
            fontSize: settings.fontSize, // Match terminal
            flex: 1,
        },
    });

    return (
        <View style={dynamicStyles.container}>
            {/* ... Notification ... */}

            {/* Content Panel (Left of Tabs) */}
            {activeMission && (
                <View style={dynamicStyles.panel}>
                    <View style={dynamicStyles.header}>
                        <Text style={dynamicStyles.title}>COMMS: {activeMission.assignerName.toUpperCase()}</Text>
                        <Text style={dynamicStyles.subtitle}>#{activeMission.id} | {activeMission.status.toUpperCase()}</Text>
                    </View>
                    <ScrollView contentContainerStyle={{ paddingBottom: 10 }}>
                        {activeMission.chatHistory.map((msg, i) => {
                            const isSameSender = i > 0 && activeMission.chatHistory[i - 1].sender === msg.sender;
                            return (
                                <View key={i} style={[dynamicStyles.messageRow, { marginTop: isSameSender ? 0 : 6 }]}>
                                    {!isSameSender && (
                                        <Text style={[
                                            dynamicStyles.sender,
                                            msg.sender === 'SYSTEM' && dynamicStyles.systemSender
                                        ]}>
                                            {`<${msg.sender}>`}
                                        </Text>
                                    )}
                                    <Text style={dynamicStyles.messageText}>{msg.message}</Text>
                                </View>
                            );
                        })}
                    </ScrollView>

                    <View style={{ flexDirection: 'row', marginTop: 10, gap: 10 }}>
                        {activeMission.status === 'pending' && (
                            <>
                                <Pressable
                                    style={{
                                        padding: 6, borderWidth: 1, borderColor: colors.primary, borderRadius: 4, backgroundColor: 'rgba(0,50,0,0.3)'
                                    }}
                                    onPress={() => onStartMission(activeMission.id)}
                                >
                                    <Text style={{ color: colors.primary, fontSize: 12, fontFamily: settings.fontFamily, fontWeight: 'bold' }}>
                                        [ ACCEPT MISSION ]
                                    </Text>
                                </Pressable>
                                <Pressable
                                    style={{
                                        padding: 6, borderWidth: 1, borderColor: colors.error, borderRadius: 4, backgroundColor: 'rgba(50,0,0,0.3)'
                                    }}
                                    onPress={() => onAbandonMission(activeMission.id)}
                                >
                                    <Text style={{ color: colors.error, fontSize: 12, fontFamily: settings.fontFamily, fontWeight: 'bold' }}>
                                        [ DECLINE ]
                                    </Text>
                                </Pressable>
                            </>
                        )}
                        {activeMission.status === 'active' && (
                            <Pressable
                                style={{
                                    padding: 6, borderWidth: 1, borderColor: colors.error, borderRadius: 4, backgroundColor: 'rgba(50,0,0,0.3)'
                                }}
                                onPress={() => onAbandonMission(activeMission.id)}
                            >
                                <Text style={{ color: colors.error, fontSize: 12, fontFamily: settings.fontFamily, fontWeight: 'bold' }}>
                                    [ ABANDON MISSION ]
                                </Text>
                            </Pressable>
                        )}
                    </View>
                </View>
            )}

            {/* Tab Stack (Right Edge) */}
            <View style={dynamicStyles.tabColumn}>
                {missions.map(mission => {
                    const isActive = activeMissionId === mission.id;
                    return (
                        <Pressable
                            key={mission.id}
                            style={[dynamicStyles.tab, isActive && dynamicStyles.activeTab]}
                            onPress={() => handleTabPress(mission.id)}
                        >
                            <View style={dynamicStyles.tabTextContainer}>
                                <Text
                                    style={[dynamicStyles.tabText, isActive && dynamicStyles.activeTabText]}
                                    numberOfLines={1}
                                >
                                    {mission.assignerName.toUpperCase()}
                                </Text>
                            </View>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
};
