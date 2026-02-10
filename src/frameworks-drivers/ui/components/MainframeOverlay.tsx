/**
 * MainframeOverlay - Humble View (Presentation Layer)
 * 
 * High-fidelity Projector HUD for the Glass Box simulation.
 * Refactored to use react-native-reanimated for native thread performance.
 * 
 * Pillar: THE STORYTELLER'S CODE (Visual Narrative)
 * Pillar: Swift Stream (Performance Animations)
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { 
    useSharedValue, 
    useAnimatedStyle, 
    withTiming, 
    withSpring,
    withSequence,
    withRepeat,
    withDelay,
    interpolate
} from 'react-native-reanimated';
import { useProcess } from '../context/ProcessProvider';
import { useTheme } from '../context/ThemeContext';
import { THEME } from '../Theme';
import { GameEventType } from '../../../domain/services/SimulationBus';
import { useVisualDirector } from '../../../interface-adapters/ui/VisualCortex/useVisualDirector';
import { VisualPriority } from '../../../interface-adapters/ui/VisualCortex/VisualPriority';

export const MainframeOverlay: React.FC = () => {
    const { gameManager, bus } = useProcess();
    const { theme, settings } = useTheme();
    const colors = theme.colors;
    const { requestFocus, releaseFocus } = useVisualDirector();

    // --- State ---
    const [activeVerb, setActiveVerb] = useState<string | null>(null);
    const [projectedGlyph, setProjectedGlyph] = useState<string | null>(null);
    const [multiplier, setMultiplier] = useState(1.0);
    const [sessionReward, setSessionReward] = useState(0);
    const [showPerfect, setShowPerfect] = useState(false);
    
    const isVisible = !!(projectedGlyph || showPerfect);

    // --- Humble State (Shared Values) ---
    const fadeVal = useSharedValue(0);
    const scaleVal = useSharedValue(1.0);
    const perfectVal = useSharedValue(0);

    // --- Animated Styles ---
    const overlayStyle = useAnimatedStyle(() => ({
        opacity: fadeVal.value,
    }));

    const glyphStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scaleVal.value }],
    }));

    const perfectStyle = useAnimatedStyle(() => ({
        opacity: perfectVal.value,
        transform: [{ translateY: interpolate(perfectVal.value, [0, 1], [-20, 0]) }],
    }));

    // 0. Rhythmic Pulse & Visibility Sync
    useEffect(() => {
        if (isVisible) {
            const granted = requestFocus('mainframe-overlay', VisualPriority.FOCUS);
            if (granted) {
                fadeVal.value = withTiming(1, { duration: 300 });
                // Continuous Pulse
                scaleVal.value = withRepeat(
                    withSequence(
                        withTiming(1.15, { duration: 250 }),
                        withTiming(1.0, { duration: 250 })
                    ),
                    -1, // Loop forever
                    true // Reverse
                );
            }
        } else {
            fadeVal.value = withTiming(0, { duration: 300 });
            scaleVal.value = withTiming(1.0, { duration: 300 });
            releaseFocus('mainframe-overlay');
        }
    }, [isVisible, requestFocus, releaseFocus]);

    // 1. Event Subscription Effect
    useEffect(() => {
        const unsubTutor = bus.subscribe(GameEventType.TUTOR_EVENT, (event) => {
            const tutorEvent = event.payload;
            const { type, payload } = tutorEvent;
            const typeStr = type as string;
            
            if (typeStr === 'PRESENTATION_START') {
                setActiveVerb(payload.verb);
            } else if (typeStr === 'THEATRE_COMPLETE' || typeStr === 'PRESENTATION_END') {
                setActiveVerb(null);
            }
        });

        const unsubEconomy = bus.subscribe(GameEventType.ECONOMY_UPDATE, (event) => {
            setMultiplier(event.payload.hashRate);
            setSessionReward(event.payload.sessionReward || 0);
        });

        const unsubKeystroke = bus.subscribe(GameEventType.KEYSTROKE_ACCEPTED, () => {
            if (!gameManager.tutorEngine.isActive()) return;

            // "PERFECT" Pop-up
            setShowPerfect(true);
            perfectVal.value = withSequence(
                withTiming(1, { duration: 100 }),
                withDelay(200, withTiming(0, { duration: 400 }))
            );
            
            // Auto-hide flag after animation
            setTimeout(() => setShowPerfect(false), 800);
        });

        return () => {
            unsubTutor();
            unsubEconomy();
            unsubKeystroke();
        };
    }, [bus, gameManager]);

    // 2. Glyph Update Logic
    useEffect(() => {
        const updateGlyph = () => {
            if (gameManager.tutorEngine.isActive()) {
                const lesson = gameManager.tutorEngine.getCurrentLesson();
                if (lesson) {
                    const completed = gameManager.tutorEngine.getCompletedText();
                    const next = lesson.text[completed.length];
                    setProjectedGlyph(next || null);
                }
            } else {
                setProjectedGlyph(null);
            }
        };

        const unsubscribe = bus.subscribe(GameEventType.TUTOR_EVENT, updateGlyph);
        updateGlyph();
        return unsubscribe;
    }, [gameManager, bus]);

    const dynamicStyles = StyleSheet.create({
        overlay: {
            ...StyleSheet.absoluteFillObject,
            backgroundColor: 'transparent',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 5,
        },
        glyphText: {
            fontFamily: settings.fontFamily,
            fontSize: 160,
            color: colors.secondary,
            fontWeight: '900',
            backgroundColor: colors.background,
        },
        multiplierText: {
            fontFamily: settings.fontFamily,
            fontSize: 24,
            color: colors.text.inverted,
            backgroundColor: colors.primary,
            paddingHorizontal: 12,
            paddingVertical: 4,
            marginTop: 20,
            letterSpacing: 2,
            fontWeight: 'bold',
        },
        rewardText: {
            fontFamily: settings.fontFamily,
            fontSize: 16,
            color: colors.text.inverted,
            backgroundColor: colors.secondary,
            paddingHorizontal: 10,
            paddingVertical: 2,
            marginTop: 10,
            fontWeight: 'bold',
        },
        perfectText: {
            position: 'absolute',
            top: '25%',
            fontFamily: settings.fontFamily,
            fontSize: 56,
            color: colors.secondary,
            fontWeight: '900',
            letterSpacing: 12,
            backgroundColor: colors.background,
            paddingHorizontal: 20,
            paddingVertical: 10,
            borderWidth: 4,
            borderColor: colors.secondary,
        }
    });

    return (
        <Animated.View 
            pointerEvents={isVisible ? 'auto' : 'none'}
            style={[dynamicStyles.overlay, overlayStyle]}
        >
            {showPerfect && (
                <Animated.Text style={[dynamicStyles.perfectText, perfectStyle]}>
                    PERFECT
                </Animated.Text>
            )}
            
            {projectedGlyph && (
                <View style={{ alignItems: 'center' }}>
                    <Animated.Text style={[dynamicStyles.glyphText, glyphStyle]}>
                        {projectedGlyph}
                    </Animated.Text>
                    <Text style={dynamicStyles.multiplierText}>{multiplier.toFixed(2)}x HASHRATE</Text>
                    <Text style={dynamicStyles.rewardText}>
                        +Ƶ {sessionReward.toFixed(12)}
                    </Text>
                </View>
            )}
        </Animated.View>
    );
};
