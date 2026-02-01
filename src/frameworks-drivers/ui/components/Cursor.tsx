import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet, ViewStyle } from 'react-native';
import { THEME } from '../Theme';

import { TutorEmotion } from '../../../domain/entities/TutorEngine';

interface CursorProps {
    color: string;
    inputTrigger?: any; // Value that changes to trigger reaction (e.g. input length or string)
    emotion?: TutorEmotion;
}

/**
 * Cursor Component - UI Component
 * 
 * An "Emotional" cursor that breathes when idle and reacts when typing.
 * Adapts to Tutor's emotional state.
 */
export const Cursor: React.FC<CursorProps> = ({ color, inputTrigger, emotion = TutorEmotion.NORMAL }) => {
    const opacityAnim = useRef(new Animated.Value(1)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const shakeAnim = useRef(new Animated.Value(0)).current;

    // Idle Square-Wave Blink (Hard On/Off)
    useEffect(() => {
        const blink = Animated.loop(
            Animated.sequence([
                Animated.timing(opacityAnim, {
                    toValue: 0,
                    duration: 0, // Instant Off
                    useNativeDriver: true,
                }),
                Animated.delay(500),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 0, // Instant On
                    useNativeDriver: true,
                }),
                Animated.delay(500),
            ])
        );
        blink.start();
        return () => blink.stop();
    }, [opacityAnim]);

    // Emotion Animation (Shake/Jitter)
    useEffect(() => {
        shakeAnim.stopAnimation();
        shakeAnim.setValue(0);

        if (emotion === TutorEmotion.RESTLESS) {
            // Jitter
            Animated.loop(
                Animated.sequence([
                    Animated.timing(shakeAnim, { toValue: 2, duration: 50, useNativeDriver: true }),
                    Animated.timing(shakeAnim, { toValue: -2, duration: 50, useNativeDriver: true }),
                    Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
                ])
            ).start();
        } else if (emotion === TutorEmotion.MAD || emotion === TutorEmotion.CRASH_OUT) {
            // ... violent shake code if needed ...
        }
    }, [emotion, shakeAnim]);

    // Reaction: Removed "Squish". The cursor is solid iron.
    // It does not flinch when you type.

    const styles = StyleSheet.create({
        cursor: {
            width: 10,
            height: 20,
            backgroundColor: (emotion === TutorEmotion.MAD || emotion === TutorEmotion.CRASH_OUT) ? '#ff0000' : color,
            marginLeft: 1, // Slight gap from text
        }
    });

    return (
        <Animated.View
            style={[
                styles.cursor,
                {
                    opacity: opacityAnim,
                    transform: [
                        { scaleX: scaleAnim },
                        { scaleY: scaleAnim }, // Uniform scale for now, can separate if we want squash/stretch logic
                        { translateX: shakeAnim }
                    ]
                }
            ]}
        />
    );
};
