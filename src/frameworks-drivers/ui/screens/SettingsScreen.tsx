/**
 * SettingsScreen - Presentation Layer
 * 
 * Hardware-style Options menu for the Terminalator.
 * Allows changing themes and fonts with a premium industrial aesthetic.
 * 
 * Pillar: THE STORYTELLER’S CODE (Literate Documentation)
 * Pillar: THE BALANCED SCALE (KISS)
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { THEME } from '../Theme';
import { useTheme } from '../context/ThemeContext';
import { THEMES } from '../../../domain/entities/Theme';
import { ConsoleLayout } from '../components/ConsoleLayout';

const FONTS = [
    { id: 'SpaceMono_400Regular', name: 'Space Mono (Standard)' },
    { id: 'RobotoMono_400Regular', name: 'Roboto Mono' },
    { id: 'Inconsolata_400Regular', name: 'Inconsolata' },
    { id: 'UbuntuMono_400Regular', name: 'Maple Mono (Optimized)' }, // Use Ubuntu as high-qual alternative for this sim
];

export const SettingsScreen: React.FC = () => {
    const navigation = useNavigation();
    const { theme, settings, setTheme, setFont } = useTheme();

    const curColors = theme.colors;

    const dynamicStyles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: curColors.background,
            padding: 20,
        },
        title: {
            color: curColors.primary,
            fontSize: 24,
            fontWeight: 'bold',
            fontFamily: settings.fontFamily,
            marginBottom: 20,
            textDecorationLine: 'underline',
        },
        sectionLabel: {
            color: curColors.secondary,
            fontSize: 14,
            fontFamily: settings.fontFamily,
            marginTop: 20,
            marginBottom: 10,
            letterSpacing: 2,
        },
        optionBlock: {
            borderWidth: 1,
            borderColor: curColors.border,
            padding: 15,
            marginBottom: 10,
            backgroundColor: 'rgba(0, 255, 65, 0.02)',
        },
        activeOptionBlock: {
            borderColor: curColors.primary,
            backgroundColor: 'rgba(0, 255, 65, 0.1)',
            borderLeftWidth: 10,
        },
        optionText: {
            color: curColors.text.primary,
            fontSize: 18,
            fontFamily: settings.fontFamily,
        },
        activeOptionText: {
            color: curColors.primary,
            fontWeight: 'bold',
        },
        previewRow: {
            flexDirection: 'row',
            marginTop: 5,
            gap: 5,
        },
        colorBox: {
            width: 20,
            height: 20,
            borderWidth: 1,
            borderColor: '#555',
        },
        backButton: {
            marginTop: 40,
            borderWidth: 2,
            borderColor: curColors.primary,
            padding: 15,
            alignItems: 'center',
            backgroundColor: curColors.background,
        },
        backButtonText: {
            color: curColors.primary,
            fontSize: 18,
            fontWeight: 'bold',
            fontFamily: settings.fontFamily,
        }
    });

    const topContent = (
        <ScrollView style={dynamicStyles.container}>
            <Text style={dynamicStyles.title}>SYSTEM_FIRMWARE_v4.0 // OPTIONS</Text>

            <Text style={dynamicStyles.sectionLabel}>[ VISUAL PROTOCOL ]</Text>
            {Object.values(THEMES).map(t => (
                <Pressable
                    key={t.id}
                    style={[dynamicStyles.optionBlock, settings.themeId === t.id && dynamicStyles.activeOptionBlock]}
                    onPress={() => setTheme(t.id)}
                >
                    <Text style={[dynamicStyles.optionText, settings.themeId === t.id && dynamicStyles.activeOptionText]}>
                        {t.name.toUpperCase()}
                    </Text>
                    <View style={dynamicStyles.previewRow}>
                        <View style={[dynamicStyles.colorBox, { backgroundColor: t.colors.background }]} />
                        <View style={[dynamicStyles.colorBox, { backgroundColor: t.colors.primary }]} />
                        <View style={[dynamicStyles.colorBox, { backgroundColor: t.colors.secondary }]} />
                    </View>
                </Pressable>
            ))}

            <Text style={dynamicStyles.sectionLabel}>[ TYPOGRAPHY ENGINE ]</Text>
            {FONTS.map(f => (
                <Pressable
                    key={f.id}
                    style={[dynamicStyles.optionBlock, settings.fontFamily === f.id && dynamicStyles.activeOptionBlock]}
                    onPress={() => setFont(f.id)}
                >
                    <Text style={[dynamicStyles.optionText, settings.fontFamily === f.id && dynamicStyles.activeOptionText, { fontFamily: f.id }]}>
                        {f.name}
                    </Text>
                </Pressable>
            ))}

            <Pressable style={dynamicStyles.backButton} onPress={() => navigation.goBack()}>
                <Text style={dynamicStyles.backButtonText}>[ RETURN TO SHELL ]</Text>
            </Pressable>
        </ScrollView>
    );

    return (
        <ConsoleLayout
            status="CONFIGURING HARDWARE"
            topContent={topContent}
            middleContent={null}
            bottomContent={null}
        />
    );
};
