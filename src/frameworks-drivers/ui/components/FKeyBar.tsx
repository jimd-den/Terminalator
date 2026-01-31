/**
 * FKeyBar - Presentation Layer
 *
 * A retro-styled Function Key bar (F1-F12) for mobile quick actions.
 * Mimics the bottom row of typical 80s TUI applications (Midnight Commander, DOS Shell).
 *
 * Pillar: The Storyteller’s Code (Nostalgia)
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { THEME } from '../Theme';

export interface FKeyDef {
    key: string;   // e.g. "F1"
    label: string; // e.g. "HELP"
    action: () => void;
}

interface FKeyBarProps {
    keys: FKeyDef[];
}

export const FKeyBar: React.FC<FKeyBarProps> = ({ keys }) => {
    const { theme, settings } = useTheme();
    const colors = theme.colors;

    const dynamicStyles = StyleSheet.create({
        container: {
            backgroundColor: colors.background,
            paddingVertical: 2,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
        },
        scrollContent: {
            paddingHorizontal: THEME.spacing.sm,
            gap: 2,
        },
        keyContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.background,
            paddingHorizontal: 8,
            paddingVertical: 6,
            marginHorizontal: 1,
            // 80s style: F-Keys often looked like blocks
        },
        keyLabel: {
            color: colors.background,
            backgroundColor: colors.primary,
            fontFamily: settings.fontFamily,
            fontSize: 10,
            fontWeight: 'bold',
            paddingHorizontal: 4,
            paddingVertical: 1,
            marginRight: 4,
        },
        actionLabel: {
            color: colors.primary,
            fontFamily: settings.fontFamily,
            fontSize: 10,
            fontWeight: 'bold',
        }
    });

    return (
        <View style={dynamicStyles.container}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 2 }}>
                {keys.map((k) => (
                    <Pressable
                        key={k.key}
                        style={({ pressed }) => [
                            dynamicStyles.keyContainer,
                            pressed && { backgroundColor: colors.primary, opacity: 0.8 }
                        ]}
                        onPress={k.action}
                    >
                        {({ pressed }) => (
                            <>
                                <Text style={[
                                    dynamicStyles.keyLabel,
                                    pressed && { color: colors.primary, backgroundColor: colors.background }
                                ]}>
                                    {k.key}
                                </Text>
                                <Text style={[
                                    dynamicStyles.actionLabel,
                                    pressed && { color: colors.background }
                                ]}>
                                    {k.label}
                                </Text>
                            </>
                        )}
                    </Pressable>
                ))}
            </View>
        </View>
    );
};
