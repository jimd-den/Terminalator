import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Animated } from 'react-native';
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
    const [expanded, setExpanded] = useState(false);
    const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null);

    // Animation state for the sprite
    const [frame, setFrame] = useState(0);

    // Sprite frames (Retro ASCII style)
    const frames = [
        "( ^_^)",
        "( >_<)",
        "( O_O)",
        "( -_-)"
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setFrame((current) => (current + 1) % frames.length);
        }, 800);
        return () => clearInterval(interval);
    }, []);

    const [notification, setNotification] = useState<string | null>(null);
    const prevMissionsLength = React.useRef(missions.length);

    useEffect(() => {
        if (missions.length > prevMissionsLength.current) {
            const newMission = missions[missions.length - 1];
            // Show the actual message (shortened description)
            setNotification(`[!] ${newMission.type.toUpperCase()}: ${newMission.description}`);
            const timer = setTimeout(() => setNotification(null), 5000);
            return () => clearTimeout(timer);
        }
        prevMissionsLength.current = missions.length;
    }, [missions]);

    const toggleExpand = () => {
        setExpanded(!expanded);
        // Only return focus if we are CLOSING the tab.
        // If opening, user might want to scroll/click.
        if (expanded) {
            setTimeout(refocus, 50);
        }
    };

    const handleSelect = (id: string) => {
        if (selectedMissionId === id) {
            setSelectedMissionId(null);
        } else {
            setSelectedMissionId(id);
        }
        // DO NOT REFOCUS HERE. Let the user browse the mission details.
    };

    const dynamicStyles = StyleSheet.create({
        container: {
            position: 'absolute',
            right: 0,
            top: 200, // Moved down (was 100)
            bottom: 100,
            zIndex: 1000,
            flexDirection: 'row',
            alignItems: 'flex-start',
        },
        notificationBubble: {
            position: 'absolute',
            right: 60, // To the left of the tab
            top: 10,
            backgroundColor: colors.surface,
            borderColor: colors.primary,
            borderWidth: 1,
            padding: 8,
            borderRadius: 4,
            maxWidth: 300, // Wider for full text
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.5,
            shadowRadius: 4,
        },
        notificationText: {
            color: colors.primary,
            fontFamily: settings.fontFamily,
            fontSize: 12,
            fontWeight: 'bold',
        },
        tab: {
            backgroundColor: colors.surface,
            borderColor: colors.primary,
            borderWidth: 1,
            borderRightWidth: 0, // Connect to panel
            paddingVertical: 20, // Taller (was 10)
            paddingHorizontal: 5,
            borderTopLeftRadius: 4,
            borderBottomLeftRadius: 4,
            width: 40, // Wider (was 30)
            alignItems: 'center',
            justifyContent: 'center',
        },
        tabText: {
            color: colors.primary,
            fontFamily: settings.fontFamily,
            fontSize: 14, // Larger text (was 10)
            lineHeight: 16,
            width: 140, // Rotate trick container
            textAlign: 'center',
            // transform: [{ rotate: '-90deg' }] // React Native doesn't support string rotate in strict styles sometimes without view wrapper
        },
        verticalText: {
            transform: [{ rotate: '-90deg' }],
            width: 140,
            textAlign: 'center'
        },
        panel: {
            width: 350, // Wider panel (was 300)
            height: '60%', // Fixed height relative to container? Or let it flex.
            maxHeight: 600,
            backgroundColor: 'rgba(0,0,0,0.95)', // High contrast opaque
            borderColor: colors.primary,
            borderWidth: 1,
            padding: THEME.spacing.md,
            display: expanded ? 'flex' : 'none',
        },
        header: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            paddingBottom: 8,
            marginBottom: 8,
        },
        title: {
            color: colors.text.primary,
            fontFamily: settings.fontFamily,
            fontSize: THEME.typography.fontSize.lg,
            fontWeight: 'bold',
        },
        sprite: {
            color: colors.secondary,
            fontFamily: settings.fontFamily,
            fontSize: THEME.typography.fontSize.lg,
        },
        channelItem: {
            marginBottom: 4,
            padding: 4,
        },
        channelHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
        },
        channelName: {
            color: colors.primary,
            fontFamily: settings.fontFamily,
            fontWeight: 'bold',
        },
        channelTopic: {
            color: colors.text.dim,
            fontFamily: settings.fontFamily,
            fontSize: 12,
            marginLeft: 8,
        },
        messageBlock: {
            marginTop: 4,
            paddingLeft: 8,
            borderLeftWidth: 1,
            borderLeftColor: colors.border,
        },
        messageRow: {
            marginBottom: 2,
        },
        sender: {
            color: colors.secondary,
            fontWeight: 'bold',
            fontSize: 12,
        },
        messageText: {
            color: colors.secondary,
            fontFamily: settings.fontFamily,
            fontSize: 12,
        },
        empty: {
            color: colors.text.dim,
            fontFamily: settings.fontFamily,
            fontStyle: 'italic',
            marginTop: 20,
            textAlign: 'center',
        }
    });

    return (
        <View style={dynamicStyles.container}>
            {/* Notification Bubble */}
            {notification && (
                <View style={dynamicStyles.notificationBubble}>
                    <Text style={dynamicStyles.notificationText}>{notification}</Text>
                </View>
            )}

            {/* The Tab Handle */}
            <Pressable style={dynamicStyles.tab} onPress={toggleExpand}>
                <View style={{ transform: [{ rotate: '-90deg' }] }}>
                    <Text style={{
                        color: colors.primary,
                        fontFamily: settings.fontFamily,
                        fontSize: 12,
                        width: 100,
                        textAlign: 'center'
                    }}>
                        IRC
                    </Text>
                </View>
            </Pressable>

            {/* The Content Panel */}
            {expanded && (
                <View style={dynamicStyles.panel}>
                    <View style={dynamicStyles.header}>
                        <Text style={dynamicStyles.title}>NETWORK</Text>
                        <Text style={dynamicStyles.sprite}>{frames[frame]}</Text>
                    </View>

                    <ScrollView>
                        {missions.length === 0 ? (
                            <Text style={dynamicStyles.empty}>No active channels.</Text>
                        ) : (
                            missions.map((m) => (
                                <Pressable
                                    key={m.id}
                                    style={[
                                        dynamicStyles.channelItem,
                                        selectedMissionId === m.id && { backgroundColor: 'rgba(255,255,255,0.05)' }
                                    ]}
                                    onPress={() => handleSelect(m.id)}
                                >
                                    <View style={dynamicStyles.channelHeader}>
                                        <Text style={dynamicStyles.channelName}>#op_{m.type}_{m.id}</Text>
                                        <Text style={{ color: colors.text.dim }}>{selectedMissionId === m.id ? '▼' : '▶'}</Text>
                                    </View>

                                    {selectedMissionId === m.id && (
                                        <View style={dynamicStyles.messageBlock}>
                                            <Text style={dynamicStyles.channelTopic}>Topic: {m.target}</Text>
                                            {m.chatHistory.map((msg, i) => (
                                                <View key={i} style={dynamicStyles.messageRow}>
                                                    <Text style={dynamicStyles.sender}>{`<${msg.sender}>`}</Text>
                                                    <Text style={dynamicStyles.messageText}>{msg.message}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    )}
                                </Pressable>
                            ))
                        )}
                    </ScrollView>
                </View>
            )}
        </View>
    );
};
