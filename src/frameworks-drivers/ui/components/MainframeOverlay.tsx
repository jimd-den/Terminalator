/**
 * MainframeOverlay - Presentation Layer
 * 
 * High-fidelity Projector HUD for the Glass Box simulation.
 * Handles Phase V (Projector HUD) feedback.
 * 
 * Pillar: THE STORYTELLER'S CODE (Visual Narrative)
 * Pillar: THESwift Stream (Performance Animations)
 */

import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { useProcess } from '../context/ProcessProvider';
import { useTheme } from '../context/ThemeContext';
import { THEME } from '../Theme';
import { GameEventType } from '../../../domain/services/SimulationBus';

export const MainframeOverlay: React.FC = () => {
    const { gameManager, bus } = useProcess();
    const { theme } = useTheme();
    const colors = theme.colors;

    // --- State ---
    const [activeVerb, setActiveVerb] = useState<string | null>(null);
    const [projectedGlyph, setProjectedGlyph] = useState<string | null>(null);
    const [multiplier, setMultiplier] = useState(1.0);
    const [sessionReward, setSessionReward] = useState(0);
    const [showPerfect, setShowPerfect] = useState(false);
    
    const isVisible = !!(projectedGlyph || showPerfect);

    // --- Animations ---
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(1.0)).current;
    const perfectAnim = useRef(new Animated.Value(0)).current;

    const useNativeDriver = Platform.OS !== 'web';

    // 0. Rhythmic Pulse (Continuous)
    const pulseAnim = useRef<Animated.CompositeAnimation | null>(null);
    useEffect(() => {
        if (isVisible) {
            const pulse = () => {
                pulseAnim.current = Animated.sequence([
                    Animated.timing(scaleAnim, { toValue: 1.15, duration: 250, useNativeDriver }),
                    Animated.timing(scaleAnim, { toValue: 1.0, duration: 250, useNativeDriver })
                ]);
                pulseAnim.current.start(({ finished }) => {
                    if (finished) pulse();
                });
            };
            pulse();
        } else {
            pulseAnim.current?.stop();
            scaleAnim.setValue(1.0);
        }
        return () => {
            pulseAnim.current?.stop();
        };
    }, [isVisible, scaleAnim, useNativeDriver]);

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
            // Only show "PERFECT" during an active tutor lesson
            if (!gameManager.tutorEngine.isActive()) return;

            // "PERFECT" Pop-up
            setShowPerfect(true);
            perfectAnim.setValue(1);
            Animated.parallel([
                Animated.timing(perfectAnim, { toValue: 0, duration: 400, useNativeDriver }),
            ]).start(() => setShowPerfect(false));
        });

        return () => {
            unsubTutor();
            unsubEconomy();
            unsubKeystroke();
        };
    }, [bus, perfectAnim, useNativeDriver]);

    // 2. Glyph Update Logic (Event-Driven)
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

        // Subscribe to tutor events to update glyph
        const unsubscribe = bus.subscribe(GameEventType.TUTOR_EVENT, () => {
            updateGlyph();
        });

        // Initial check
        updateGlyph();

        return unsubscribe;
    }, [gameManager, bus]);

    // 3. Visibility Animation Sync
    useEffect(() => {
        if (isVisible) {
            Animated.timing(fadeAnim, { 
                toValue: 1, 
                duration: 300, 
                useNativeDriver 
            }).start();
        } else {
            Animated.timing(fadeAnim, { 
                toValue: 0, 
                duration: 300, 
                useNativeDriver 
            }).start();
        }
    }, [isVisible, fadeAnim, useNativeDriver]);

    const dynamicStyles = StyleSheet.create({
        overlay: {
            ...StyleSheet.absoluteFillObject,
            backgroundColor: 'transparent', // Container is transparent
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 5,
        },
        verbText: {
            fontFamily: THEME.typography.fontFamily,
            fontSize: THEME.typography.fontSize.xl,
            color: colors.primary,
            fontWeight: 'bold',
            textAlign: 'center',
            letterSpacing: 4,
            backgroundColor: '#000', // Solid background for text
            padding: 10,
        },
        glyphText: {
            fontFamily: THEME.typography.fontFamily,
            fontSize: 160,
            color: colors.secondary,
            fontWeight: '900',
            backgroundColor: '#000', // Solid background
        },
        multiplierText: {
            fontFamily: THEME.typography.fontFamily,
            fontSize: 24,
            color: '#000',
            backgroundColor: colors.primary,
            paddingHorizontal: 12,
            paddingVertical: 4,
            marginTop: 20,
            letterSpacing: 2,
            fontWeight: 'bold',
        },
        rewardText: {
            fontFamily: THEME.typography.fontFamily,
            fontSize: 16,
            color: '#000',
            backgroundColor: colors.secondary,
            paddingHorizontal: 10,
            paddingVertical: 2,
            marginTop: 10,
            fontWeight: 'bold',
        },
        perfectText: {
            position: 'absolute',
            top: '20%',
            fontFamily: THEME.typography.fontFamily,
            fontSize: 40,
            color: colors.secondary,
            fontWeight: 'bold',
            letterSpacing: 8,
            backgroundColor: '#000',
            padding: 10,
        }
    });

    return (
        <Animated.View 
            pointerEvents={isVisible ? 'auto' : 'none'}
            style={[dynamicStyles.overlay, { opacity: isVisible ? fadeAnim : 0 }]}
        >
            {showPerfect && (
                <Animated.Text style={[dynamicStyles.perfectText, { opacity: perfectAnim, transform: [{ translateY: perfectAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] }]}>
                    PERFECT
                </Animated.Text>
            )}

            {/* Glyph and Economy Stats handled here, Verbs handled by ResultStackView */}
            
            {projectedGlyph && (
                <View style={{ alignItems: 'center' }}>
                    <Animated.Text style={[dynamicStyles.glyphText, { transform: [{ scale: scaleAnim }] }]}>
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