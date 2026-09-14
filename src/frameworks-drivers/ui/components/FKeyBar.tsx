/**
 * FKeyBar - Presentation Layer
 *
 * A retro-styled Function Key bar (F1-F12) for mobile quick actions.
 * Mimics the bottom row of typical 80s TUI applications (Midnight Commander,
 * DOS Shell) -- but with modern press feedback, because a key that only
 * changes colour reads as a label, while a key that physically gives under
 * the thumb reads as a button.
 *
 * Pillar: The Storyteller’s Code (Nostalgia)
 */

import React, { useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { THEME } from '../Theme';
import { pressIn, pressOut, enter, enterStyle, staggerDelay } from '../Motion';

export interface FKeyDef {
    key: string;   // e.g. "F1"
    label: string; // e.g. "HELP"
    action: () => void;
}

interface FKeyBarProps {
    keys: FKeyDef[];
}

/**
 * One key. Owns its own animation values so a press affects only the key
 * actually touched -- sharing a driver across the row makes every key twitch
 * whenever any one of them is pressed.
 */
const FKey: React.FC<{ def: FKeyDef; index: number; styles: any; colors: any }> = ({
    def, index, styles, colors
}) => {
    const scale = useRef(new Animated.Value(1)).current;
    const appear = useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        enter(appear, staggerDelay(index)).start();
    }, [appear, index]);

    // Compose the entrance transform with the press scale once, so the two
    // do not fight over the transform array.
    const entrance = enterStyle(appear, 8);
    const animatedStyle = {
        opacity: entrance.opacity,
        transform: [...entrance.transform, { scale }]
    };

    return (
        <Animated.View style={animatedStyle}>
            <Pressable
                onPressIn={() => pressIn(scale).start()}
                onPressOut={() => pressOut(scale).start()}
                onPress={def.action}
                style={({ pressed }) => [
                    styles.keyContainer,
                    pressed && { backgroundColor: colors.primary }
                ]}
            >
                {({ pressed }) => (
                    <>
                        <Text style={[
                            styles.keyLabel,
                            pressed && { color: colors.primary, backgroundColor: colors.background }
                        ]}>
                            {def.key}
                        </Text>
                        <Text style={[
                            styles.actionLabel,
                            pressed && { color: colors.background }
                        ]}>
                            {def.label}
                        </Text>
                    </>
                )}
            </Pressable>
        </Animated.View>
    );
};

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
                {keys.map((k, i) => (
                    <FKey key={k.key} def={k} index={i} styles={dynamicStyles} colors={colors} />
                ))}
            </View>
        </View>
    );
};
