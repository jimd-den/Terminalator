/**
 * VirtualKeyboard - Presentation Layer
 * 
 * A toolbar containing common terminal keys for mobile users.
 * Sits above the keyboard or at the bottom of the screen.
 */

import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { THEME } from '../../frameworks-drivers/ui/Theme';

import { useTheme } from '../context/ThemeContext';

interface VirtualKeyboardProps {
    onKeyPress: (key: string) => void;
}

const KEYS = ['TAB', 'ESC', '/', '-', 'CTRL', 'UP', 'DOWN'];

export const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({ onKeyPress }) => {
    const { theme, settings } = useTheme();
    const colors = theme.colors;

    const dynamicStyles = StyleSheet.create({
        container: {
            backgroundColor: colors.background,
            paddingHorizontal: THEME.spacing.md,
            paddingBottom: THEME.spacing.sm,
        },
        innerContainer: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'center',
            borderWidth: THEME.borders.width,
            borderColor: colors.primary,
            padding: 4,
            backgroundColor: colors.surface,
        },
        key: {
            paddingHorizontal: 12,
            paddingVertical: 8,
            margin: 4,
            borderWidth: 1,
            borderColor: colors.primary,
            backgroundColor: colors.background,
            minWidth: 44,
            alignItems: 'center',
            justifyContent: 'center',
        },
        keyText: {
            color: colors.primary,
            fontFamily: settings.fontFamily,
            fontSize: THEME.typography.fontSize.sm,
            fontWeight: 'bold',
        },
    });

    return (
        <View style={dynamicStyles.container}>
            <View style={dynamicStyles.innerContainer}>
                {KEYS.map((key) => (
                    <Pressable
                        key={key}
                        style={dynamicStyles.key}
                        onPress={() => onKeyPress(key)}
                    >
                        <Text style={dynamicStyles.keyText}>{key}</Text>
                    </Pressable>
                ))}
            </View>
        </View>
    );
};
