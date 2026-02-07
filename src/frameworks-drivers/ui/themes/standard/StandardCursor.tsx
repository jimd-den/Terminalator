import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { CursorProps } from '../../../../domain/entities/ThemeComponents';
import { TutorEmotion } from '../../../../domain/entities/TutorEngine';
import { useGame } from '../../context/GameContext';
import { GameEventType } from '../../../../domain/services/SimulationBus';

/**
 * StandardCursor - Default animated cursor with emotional awareness.
 * 
 * Pillar: THE UNIVERSAL INTERFACE (Universal Feedback)
 */
export const StandardCursor: React.FC<CursorProps> = ({
    active,
    color,
    type = 'block',
    metadata
}) => {
    const { bus } = useGame();
    const emotion = metadata?.emotion || TutorEmotion.NORMAL;
    
    const opacityAnim = useRef(new Animated.Value(1)).current;
    const shakeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;

    // Keystroke Pulse
    useEffect(() => {
        const unsubscribe = bus.subscribe(GameEventType.KEYSTROKE_ACCEPTED, () => {
            Animated.sequence([
                Animated.timing(scaleAnim, { toValue: 1.3, duration: 50, useNativeDriver: true }),
                Animated.timing(scaleAnim, { toValue: 1.0, duration: 100, useNativeDriver: true }),
            ]).start();
        });
        return unsubscribe;
    }, [bus]);

    // Idle Square-Wave Blink
    useEffect(() => {
        if (!active) {
            opacityAnim.setValue(1);
            return;
        }

        const blink = Animated.loop(
            Animated.sequence([
                Animated.timing(opacityAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
                Animated.delay(500),
                Animated.timing(opacityAnim, { toValue: 1, duration: 0, useNativeDriver: true }),
                Animated.delay(500),
            ])
        );
        blink.start();
        return () => blink.stop();
    }, [active, opacityAnim]);

    // Emotion Animation (Shake/Jitter)
    useEffect(() => {
        shakeAnim.stopAnimation();
        shakeAnim.setValue(0);

        if (emotion === TutorEmotion.RESTLESS) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(shakeAnim, { toValue: 2, duration: 50, useNativeDriver: true }),
                    Animated.timing(shakeAnim, { toValue: -2, duration: 50, useNativeDriver: true }),
                    Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
                ])
            ).start();
        }
    }, [emotion, shakeAnim]);

    const getCursorStyle = () => {
        switch (type) {
            case 'line':
                return { width: 2, height: 20 };
            case 'underline':
                return { width: 10, height: 2, marginTop: 18 };
            default: // block
                return { width: 10, height: 20 };
        }
    };

    const finalColor = (emotion === TutorEmotion.MAD || emotion === TutorEmotion.CRASH_OUT) ? '#ff0000' : color;

    return (
        <Animated.View
            style={[
                {
                    backgroundColor: finalColor,
                    opacity: opacityAnim,
                    transform: [{ translateX: shakeAnim }, { scale: scaleAnim }]
                },
                getCursorStyle(),
            ]}
        />
    );
};