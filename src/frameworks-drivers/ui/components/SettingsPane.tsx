import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { THEME } from '../Theme';
import { useTheme } from '../context/ThemeContext';
import { THEMES } from '../../../domain/entities/Theme';

const FONTS = [
    { id: 'SpaceMono_400Regular', name: 'Space Mono' },
    { id: 'RobotoMono_400Regular', name: 'Roboto Mono' },
    { id: 'Inconsolata_400Regular', name: 'Inconsolata' },
    { id: 'UbuntuMono_400Regular', name: 'Maple Mono' },
];

type SettingsTab = 'VISUAL' | 'TYPO' | 'SYSTEM';

interface SettingsPaneProps {
    onBack: () => void;
}

export const SettingsPane: React.FC<SettingsPaneProps> = ({ onBack }) => {
    const { theme, settings, setTheme, setFont, setForceKeyboardOpen } = useTheme();
    const [activeTab, setActiveTab] = useState<SettingsTab>('VISUAL');
    const colors = theme.colors;

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
            padding: THEME.spacing.md,
        },
        // Frequency Bar (Tab Selector)
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

        // Content Area
        streamContainer: {
            flex: 1,
            marginBottom: THEME.spacing.md,
        },
        optionBlock: {
            marginBottom: THEME.spacing.sm,
            borderLeftWidth: 2,
            borderLeftColor: colors.border,
            paddingLeft: THEME.spacing.sm,
            paddingVertical: 4,
        },
        activeOptionBlock: {
            borderLeftColor: colors.primary,
            backgroundColor: `${colors.primary}1A`, // 0.1 opacity of primary color
        },
        headerRow: {
            flexDirection: 'row',
            marginBottom: 2,
        },
        label: {
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
        optionTitle: {
            color: colors.text.primary,
            fontFamily: settings.fontFamily,
            fontSize: 14,
            lineHeight: 20,
        },
        activeOptionTitle: {
            color: colors.primary,
            fontWeight: 'bold',
        },

        // Color Preview for Themes
        previewRow: {
            flexDirection: 'row',
            marginTop: 4,
            gap: 4,
        },
        colorBox: {
            width: 12,
            height: 12,
            borderWidth: 1,
            borderColor: colors.border,
        },

        // Action Buttons
        actionRow: {
            marginTop: 'auto',
            gap: 8,
        },
        backButton: {
            backgroundColor: 'transparent',
            borderColor: colors.primary,
            paddingVertical: 10,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
        },
        backButtonText: {
            color: colors.primary,
            fontFamily: settings.fontFamily,
            fontSize: 14,
            fontWeight: 'bold',
            letterSpacing: 1,
        }
    });

    const renderVisual = () => (
        <ScrollView style={styles.streamContainer}>
            {Object.values(THEMES).map((t, i) => {
                const isActive = settings.themeId === t.id;
                return (
                    <Pressable 
                        key={t.id} 
                        style={[styles.optionBlock, isActive && styles.activeOptionBlock]}
                        onPress={() => setTheme(t.id)}
                    >
                        <View style={styles.headerRow}>
                            <Text style={styles.label}>THEME_ID</Text>
                            <Text style={styles.timestampLabel}>// IDX-{i.toString().padStart(3, '0')}</Text>
                        </View>
                        <Text style={[styles.optionTitle, isActive && styles.activeOptionTitle]}>
                            {t.name.toUpperCase()}
                        </Text>
                        <View style={styles.previewRow}>
                            <View style={[styles.colorBox, { backgroundColor: t.colors.background }]} />
                            <View style={[styles.colorBox, { backgroundColor: t.colors.primary }]} />
                            <View style={[styles.colorBox, { backgroundColor: t.colors.secondary }]} />
                        </View>
                    </Pressable>
                );
            })}
        </ScrollView>
    );

    const renderTypo = () => (
        <ScrollView style={styles.streamContainer}>
            {FONTS.map((f, i) => {
                const isActive = settings.fontFamily === f.id;
                return (
                    <Pressable 
                        key={f.id} 
                        style={[styles.optionBlock, isActive && styles.activeOptionBlock]}
                        onPress={() => setFont(f.id)}
                    >
                        <View style={styles.headerRow}>
                            <Text style={styles.label}>FONT_ID</Text>
                            <Text style={styles.timestampLabel}>// IDX-{i.toString().padStart(3, '0')}</Text>
                        </View>
                        <Text style={[styles.optionTitle, isActive && styles.activeOptionTitle, { fontFamily: f.id }]}>
                            {f.name}
                        </Text>
                    </Pressable>
                );
            })}
        </ScrollView>
    );

    const renderSystem = () => (
        <ScrollView style={styles.streamContainer}>
            <Pressable 
                style={[styles.optionBlock, settings.forceKeyboardOpen && styles.activeOptionBlock]}
                onPress={() => setForceKeyboardOpen(!settings.forceKeyboardOpen)}
            >
                <View style={styles.headerRow}>
                    <Text style={styles.label}>SYS_FLAG</Text>
                    <Text style={styles.timestampLabel}>// IDX-001</Text>
                </View>
                <Text style={[styles.optionTitle, settings.forceKeyboardOpen && styles.activeOptionTitle]}>
                    FORCE KEYBOARD ON: {settings.forceKeyboardOpen ? '[ ENABLED ]' : '[ DISABLED ]'}
                </Text>
                <Text style={[styles.timestampLabel, { marginTop: 4 }]}>
                    Ensures the mobile keyboard remains visible across all screens.
                </Text>
            </Pressable>
            
            <View style={styles.optionBlock}>
                <View style={styles.headerRow}>
                    <Text style={styles.label}>SYS_INFO</Text>
                    <Text style={styles.timestampLabel}>// IDX-002</Text>
                </View>
                <Text style={styles.optionTitle}>FIRMWARE: v4.0.8-STABLE</Text>
                <Text style={styles.timestampLabel}>POSIX fidelity verified. Neon bleed nominal.</Text>
            </View>
        </ScrollView>
    );

    return (
        <View style={styles.container}>
            {/* 1. Tab Selector */}
            <View style={styles.channelBar}>
                <Text style={[styles.channelText, { opacity: 1, paddingLeft: 0 }]}>FREQ:</Text>
                {(['VISUAL', 'TYPO', 'SYSTEM'] as SettingsTab[]).map(tab => {
                    const isActive = activeTab === tab;
                    return (
                        <Pressable
                            key={tab}
                            onPress={() => setActiveTab(tab)}
                            style={[styles.channelTab, isActive && styles.activeChannelTab]}
                        >
                            <Text style={[styles.channelText, isActive && styles.activeChannelText]}>
                                [{tab}]
                            </Text>
                        </Pressable>
                    );
                })}
            </View>

            {/* 2. Content */}
            {activeTab === 'VISUAL' && renderVisual()}
            {activeTab === 'TYPO' && renderTypo()}
            {activeTab === 'SYSTEM' && renderSystem()}

            {/* 3. Action Buttons */}
            <View style={styles.actionRow}>
                <Pressable style={styles.backButton} onPress={onBack}>
                    <Text style={styles.backButtonText}>[ RETURN TO SHELL ]</Text>
                </Pressable>
            </View>
        </View>
    );
};
