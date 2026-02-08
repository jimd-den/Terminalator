import { useRef, useEffect } from 'react';
import { Animated, Platform } from 'react-native';
import { TutorMessage } from '../../../domain/entities/tutor/TutorMessage';

export const useTutorAnimation = (message: TutorMessage | null) => {
    const shakeAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    const useNativeDriver = Platform.OS !== 'web';

    useEffect(() => {
        if (!message) return;

        if (message.type === 'critical') {
            // Shake Effect: Rapid 3-shake
            Animated.sequence([
                Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver }),
                Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver }),
                Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver }),
                Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver })
            ]).start();
        } else if (message.type === 'warn') {
            // Pulse Effect: Quick dim and restore
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 0.5, duration: 200, useNativeDriver }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 200, useNativeDriver })
            ]).start();
        } else {
            // Reset
            shakeAnim.setValue(0);
            pulseAnim.setValue(1);
        }
    }, [message]);

    return {
        transform: [{ translateX: shakeAnim }],
        opacity: pulseAnim
    };
};
