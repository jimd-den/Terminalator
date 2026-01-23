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

    // Idle Breathing Animation
    useEffect(() => {
        const breathe = Animated.loop(
            Animated.sequence([
                Animated.timing(opacityAnim, {
                    toValue: 0.4,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                })
            ])
        );
        breathe.start();
        return () => breathe.stop();
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
            // Violent Shake
            Animated.loop(
                Animated.sequence([
                    Animated.timing(shakeAnim, { toValue: 5, duration: 30, useNativeDriver: true }),
                    Animated.timing(shakeAnim, { toValue: -5, duration: 30, useNativeDriver: true }),
                    Animated.timing(shakeAnim, { toValue: 3, duration: 30, useNativeDriver: true }),
                    Animated.timing(shakeAnim, { toValue: -3, duration: 30, useNativeDriver: true }),
                    Animated.timing(shakeAnim, { toValue: 0, duration: 30, useNativeDriver: true }),
                ])
            ).start();
        }
    }, [emotion, shakeAnim]);

    // Reaction Animation (Triggered by input change)
    useEffect(() => {
        if (inputTrigger === undefined) return;

        // "Squish" effect: Scale X up, Y down slightly, then bounce back
        Animated.sequence([
            Animated.timing(scaleAnim, {
                toValue: 1.5, // More aggressive squish
                duration: 20, // Fast hit
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 12, // Damped quickly (no wobble)
                tension: 400, // Very high tension (snap back)
                useNativeDriver: true,
            })
        ]).start();
    }, [inputTrigger, scaleAnim]);

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
