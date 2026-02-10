import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSpring,
  Easing
} from 'react-native-reanimated';
import { useTutorMessaging } from '../../context/TutorMessagingProvider';
import { TutorPresenter } from '../../../../interface-adapters/presenters/TutorPresenter';
import { useTheme } from '../../context/ThemeContext';

/**
 * TutorOverlay - Humble View (Presentation Layer)
 * 
 * High-performance HUD for Tutor feedback using Reanimated.
 * Minimizes React re-renders by driving animations on the native thread.
 */
export const TutorOverlay: React.FC = () => {
    const { theme, settings } = useTheme();
    const colors = theme.colors;
    const { activeTutorMessage } = useTutorMessaging();

    // --- Humble State (Shared Values) ---
    const visibility = useSharedValue(0);
    const opacity = useSharedValue(0);
    const translateY = useSharedValue(20);

    // --- Presenter ---
    const presenter = useMemo(() => new TutorPresenter(visibility, opacity), [visibility, opacity]);

    useEffect(() => {
        if (activeTutorMessage) {
            presenter.presentMessage(activeTutorMessage);
            // Reanimated timing/spring logic
            visibility.value = withSpring(1);
            opacity.value = withTiming(1, { duration: 300 });
            translateY.value = withSpring(0);
        } else {
            presenter.dismiss();
            visibility.value = withTiming(0, { duration: 300 });
            opacity.value = withTiming(0, { duration: 300 });
            translateY.value = withTiming(20, { duration: 300 });
        }
    }, [activeTutorMessage, presenter]);

    // --- Animated Styles ---
    const animatedStyle = useAnimatedStyle(() => {
        return {
            opacity: opacity.value,
            transform: [
                { translateY: translateY.value },
                { scale: 0.9 + (visibility.value * 0.1) }
            ],
        };
    });

    if (!activeTutorMessage) return null;

    return (
        <View style={styles.container} pointerEvents="none">
            <Animated.View style={[styles.card, { borderColor: colors.primary, backgroundColor: colors.background_80 }, animatedStyle]}>
                <Text style={[styles.sender, { color: colors.secondary, fontFamily: settings.fontFamily }]}>
                    [ TRANSMISSION RECEIVED ]
                </Text>
                <Text style={[styles.text, { color: colors.text.primary, fontFamily: settings.fontFamily }]}>
                    {activeTutorMessage.text}
                </Text>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 500,
    },
    card: {
        width: '80%',
        padding: 24,
        borderWidth: 2,
        alignItems: 'center',
    },
    sender: {
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 12,
        letterSpacing: 4,
    },
    text: {
        fontSize: 18,
        textAlign: 'center',
        lineHeight: 26,
    }
});
