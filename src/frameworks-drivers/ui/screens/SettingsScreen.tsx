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
import { View, Text, StyleSheet, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { THEME } from '../Theme';
import { useTheme } from '../context/ThemeContext';
import { THEMES } from '../../../domain/entities/Theme';
import { ConsoleLayout } from '../components/ConsoleLayout';
import { GlobalTutorBar } from '../components/GlobalTutorBar';
import { SettingsPane } from '../components/SettingsPane';

const FONTS = [
    { id: 'SpaceMono_400Regular', name: 'Space Mono (Standard)' },
    { id: 'RobotoMono_400Regular', name: 'Roboto Mono' },
    { id: 'Inconsolata_400Regular', name: 'Inconsolata' },
    { id: 'UbuntuMono_400Regular', name: 'Maple Mono (Optimized)' }, // Use Ubuntu as high-qual alternative for this sim
];

export const SettingsScreen: React.FC = () => {
    const navigation = useNavigation();
    const { theme } = useTheme();

    const colors = theme.colors;

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
        }
    });

    const content = (
        <View style={styles.container}>
            <SettingsPane onBack={() => navigation.goBack()} />
        </View>
    );

    return (
        <ConsoleLayout
            status="CONFIGURING HARDWARE"
            topContent={content}
            middleContent={null}
            bottomContent={null}
            tutorBarComponent={<GlobalTutorBar />}
        />
    );
};
