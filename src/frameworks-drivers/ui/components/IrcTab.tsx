import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Dimensions } from 'react-native';
import { Mission } from '../../../domain/entities/Mission';
import { THEME } from '../Theme';
import { useTheme } from '../context/ThemeContext';
import { useInput } from '../context/InputContext';

interface IrcTabProps {
    missions: Mission[];
}

export const IrcTab: React.FC<IrcTabProps> = ({ missions }) => {
    const { theme, settings } = useTheme();
    const colors = theme.colors;
    const { refocus } = useInput();

    // Track which mission tab is active (open)
    const [activeMissionId, setActiveMissionId] = useState<string | null>(null);

    // Notification handling
    const [notification, setNotification] = useState<string | null>(null);
    const prevMissionsLength = useRef(missions.length);

    useEffect(() => {
        if (missions.length > prevMissionsLength.current) {
            const newMission = missions[missions.length - 1];
            setNotification(`[!] ${newMission.type.toUpperCase()}: ${newMission.description.substring(0, 30)}...`);
            const timer = setTimeout(() => setNotification(null), 5000);
            return () => clearTimeout(timer);
        }
        prevMissionsLength.current = missions.length;
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
            top: 200,
            bottom: 100,
            zIndex: 1000,
            flexDirection: 'row', // Panel | Tabs
            alignItems: 'flex-start',
            justifyContent: 'flex-end',
        },
        notificationBubble: {
            position: 'absolute',
            right: 50, // To left of tabs
            top: -40,
            backgroundColor: colors.surface,
            borderColor: colors.primary,
            borderWidth: 1,
            padding: 8,
            borderRadius: 4,
            maxWidth: 250,
        },
        notificationText: {
            color: colors.primary,
            fontFamily: settings.fontFamily,
            fontSize: 12, // Notification text can stay small or match setting
            fontWeight: 'bold',
        },
        tabColumn: {
            flexDirection: 'column',
            marginLeft: -1, // Overlap border
        },
        tab: {
            backgroundColor: colors.background,
            borderColor: colors.primary,
            borderWidth: 1,
            borderRightWidth: 0,
            width: 40,
            height: 120, // Tall tab for vertical text
            marginBottom: 8,
            borderTopLeftRadius: 8,
            borderBottomLeftRadius: 8,
            alignItems: 'center',
            justifyContent: 'center',
        },
        activeTab: {
            backgroundColor: colors.surface,
            borderRightWidth: 0, // Merge with panel
            zIndex: 10, // Bring to front
            width: 42, // Slightly wider
        },
        tabTextContainer: {
            width: 120,
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
            width: Math.min(width * 0.4, 600), // Responsive width, max 600px
            minWidth: 350, // Ensure minimum readability
            maxHeight: '100%', // Constrain to container height
            flex: 1, // Fill available vertical space
            backgroundColor: 'rgba(0,0,0,0.95)',
            borderColor: colors.primary,
            borderWidth: 1,
            padding: THEME.spacing.md,
            marginRight: -1, // Connect to tab
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
            marginBottom: 4,
            flexDirection: 'row',
            flexWrap: 'wrap',
        },
        sender: {
            color: colors.secondary,
            fontWeight: 'bold',
            fontSize: settings.fontSize, // Match terminal
            marginRight: 6,
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
            {/* Notification */}
            {notification && (
                <View style={dynamicStyles.notificationBubble}>
                    <Text style={dynamicStyles.notificationText}>{notification}</Text>
                </View>
            )}

            {/* Content Panel (Left of Tabs) */}
            {activeMission && (
                <View style={dynamicStyles.panel}>
                    <View style={dynamicStyles.header}>
                        <Text style={dynamicStyles.title}>COMMS: {activeMission.assignerName.toUpperCase()}</Text>
                        <Text style={dynamicStyles.subtitle}>SECURE CHANNEL #{activeMission.id} | OP: {activeMission.type.toUpperCase()}</Text>
                    </View>
                    <ScrollView>
                        {activeMission.chatHistory.map((msg, i) => (
                            <View key={i} style={dynamicStyles.messageRow}>
                                <Text style={[
                                    dynamicStyles.sender,
                                    msg.sender === 'SYSTEM' && dynamicStyles.systemSender
                                ]}>
                                    {`<${msg.sender}>`}
                                </Text>
                                <Text style={dynamicStyles.messageText}>{msg.message}</Text>
                            </View>
                        ))}
                    </ScrollView>
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
