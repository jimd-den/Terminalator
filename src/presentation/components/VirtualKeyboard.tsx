/**
 * VirtualKeyboard - Presentation Layer
 * 
 * A toolbar containing common terminal keys for mobile users.
 * Sits above the keyboard or at the bottom of the screen.
 */

import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { THEME } from '../../frameworks-drivers/ui/Theme';

interface VirtualKeyboardProps {
    onKeyPress: (key: string) => void;
}

const KEYS = ['TAB', 'ESC', '/', '-', 'CTRL', 'UP', 'DOWN', 'ls', 'cd ..'];

export const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({ onKeyPress }) => {
    return (
        <View style={styles.container}>
            <View style={styles.innerContainer}>
                {KEYS.map((key) => (
                    <TouchableOpacity
                        key={key}
                        style={styles.key}
                        onPress={() => onKeyPress(key)}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.keyText}>{key}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: THEME.colors.background,
        paddingHorizontal: THEME.spacing.md,
        paddingBottom: THEME.spacing.sm,
    },
    innerContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        borderWidth: THEME.borders.width,
        borderColor: THEME.colors.primary,
        padding: 4,
        backgroundColor: THEME.colors.surface,
    },
    key: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        margin: 4,
        borderWidth: 1,
        borderColor: THEME.colors.primary,
        backgroundColor: THEME.colors.background,
        minWidth: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    keyText: {
        color: THEME.colors.primary,
        fontFamily: THEME.typography.fontFamily,
        fontSize: THEME.typography.fontSize.sm,
        fontWeight: 'bold',
    },
});
