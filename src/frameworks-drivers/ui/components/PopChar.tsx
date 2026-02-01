import React, { useEffect, useRef } from 'react';
import { Animated, Text, TextStyle, StyleSheet } from 'react-native';

export type PopVariant = 'pop' | 'crawl' | 'star';

interface PopCharProps {
    children: string;
    style?: TextStyle;
    delay?: number;
    variant?: PopVariant;
    isCrashing?: boolean;
}

/**
 * PopChar Component - UI Component
 * 
 * Animates text entry with different styles.
 */
export const PopChar: React.FC<PopCharProps> = ({ children, style, delay = 0, variant = 'pop', isCrashing = false }) => {
    // Phosphor Strike: Scale starts at 1 (no Zoom), Opacity starts at 0 (Dark)
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const translateAnim = useRef(new Animated.Value(variant === 'crawl' ? 10 : 0)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;

    // Crash Animation Refs
    const crashTranslateAnim = useRef(new Animated.Value(0)).current;
    const crashRotateAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (isCrashing) {
            // Aggressive Slide Off
            Animated.parallel([
                Animated.timing(crashTranslateAnim, {
                    toValue: 100, // Slide down far
                    duration: 400,
                    useNativeDriver: true,
                }),
                Animated.timing(crashRotateAnim, {
                    toValue: 1, // 90 deg
                    duration: 400,
                    useNativeDriver: true,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 0,
                    duration: 300,
                    delay: 100,
                    useNativeDriver: true,
                })
            ]).start();
            return;
        }

        const animations = [];

        if (variant === 'pop') {
            // "Phosphor Strike" - Instant appearance with slight over-brightness (simulated by opacity) or just stable appearance.
            // Sci-fi style: No bounces. Just data.
            scaleAnim.setValue(1); // Ensure scale is 1

            // Fast fade-in to simulate phosphor lighting up (very fast)
            animations.push(
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 50, // 50ms "strike"
                    useNativeDriver: true,
                    delay
                })
            );
        } else if (variant === 'crawl') {
            animations.push(
                Animated.parallel([
                    Animated.timing(opacityAnim, {
                        toValue: 1,
                        duration: 150,
                        useNativeDriver: true,
                        delay
                    }),
                    Animated.timing(translateAnim, {
                        toValue: 0,
                        duration: 150,
                        useNativeDriver: true,
                        delay
                    })
                ])
            );
        } else if (variant === 'star') {
            // Deprecated logic, treat as pop
            scaleAnim.setValue(1);
            animations.push(
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 50,
                    useNativeDriver: true,
                    delay
                })
            );
        }

        Animated.parallel(animations).start();
    }, [variant, delay, scaleAnim, opacityAnim, translateAnim, rotateAnim, isCrashing, crashTranslateAnim, crashRotateAnim]);

    const rotateStr = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg']
    });

    const crashRotateStr = crashRotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '90deg']
    });

    const transform = [];
    if (isCrashing) {
        transform.push({ translateY: crashTranslateAnim });
        transform.push({ rotate: crashRotateStr });
    } else {
        if (variant === 'pop' || variant === 'star') transform.push({ scale: scaleAnim });
        if (variant === 'crawl') transform.push({ translateY: translateAnim });
        if (variant === 'star') transform.push({ rotate: rotateStr });
    }

    return (
        <Animated.Text
            style={[
                style,
                {
                    opacity: opacityAnim,
                    transform
                }
            ]}
        >
            {children}
        </Animated.Text>
    );
};
