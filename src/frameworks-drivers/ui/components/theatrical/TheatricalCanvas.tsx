import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Animated, Platform, Text } from 'react-native';
import { useProcess } from '../../context/ProcessProvider';
import { GameEventType } from '../../../../domain/services/SimulationBus';
import { useTheme } from '../../context/ThemeContext';
import { THEME } from '../../Theme';

/**
 * TheatricalCanvas - Presentation Layer Component
 * 
 * Standalone plugin for theatrical mainframe animations.
 * Purely event-driven via SimulationBus.
 * 
 * Pillar: THE STORYTELLER'S CODE (Visual Narrative)
 * Pillar: THE HUMBLE OBJECT (Decoupled Detail)
 */
export const TheatricalCanvas: React.FC = () => {
    const { bus } = useProcess();
    const { theme } = useTheme();
    const colors = theme.colors;
    
    // --- Animation State ---
    const [isAnimating, setIsAnimating] = useState(false);
    const [activeVerb, setActiveVerb] = useState('');
    const [isCriticalError, setIsCriticalError] = useState(false);
    
    const shakeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const translateYAnim = useRef(new Animated.Value(0)).current;
    const useNativeDriver = Platform.OS !== 'web';

    useEffect(() => {
        console.log("[TheatricalCanvas] Mounted and listening.");
        const unsubTutor = bus.subscribe(GameEventType.TUTOR_EVENT, (event) => {
            const tutorEvent = event.payload;
            const { type, payload } = tutorEvent;
            
            if (type === 'PRESENTATION_START') {
                setIsAnimating(true);
                setActiveVerb(payload.verb || 'PROCESSING');
                
                // Entry Animation: Pop-in rectangle
                Animated.parallel([
                    Animated.spring(scaleAnim, { toValue: 1, friction: 4, useNativeDriver }),
                    Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver })
                ]).start();

                const duration = 1000 + (Math.random() * 500);
                setTimeout(() => {
                    console.log(`[TheatricalCanvas] Animation COMPLETE for PRE: ${payload.command}`);
                    bus.emit(GameEventType.TUTOR_EVENT, { type: 'ANIMATION_COMPLETE', payload: { command: payload.command } });
                }, duration);

            } else if (type === 'PRESENTATION_RESULT') {
                console.log(`[TheatricalCanvas] Result animation requested: ${payload.exitCode}`);
                
                if (payload.exitCode !== 0) {
                    setIsCriticalError(true);
                    Animated.sequence([
                        Animated.timing(shakeAnim, { toValue: 20, duration: 50, useNativeDriver }),
                        Animated.timing(shakeAnim, { toValue: -20, duration: 50, useNativeDriver }),
                        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver })
                    ]).start(() => {
                        setTimeout(() => setIsCriticalError(false), 500);
                    });
                }

                setTimeout(() => {
                    // Exit Animation: Move down to stack position
                    Animated.parallel([
                        Animated.timing(scaleAnim, { toValue: 0.95, duration: 300, useNativeDriver }),
                        Animated.timing(translateYAnim, { toValue: 200, duration: 300, useNativeDriver }),
                        Animated.timing(opacityAnim, { toValue: 0, duration: 250, delay: 50, useNativeDriver })
                    ]).start(() => {
                        setIsAnimating(false);
                        // Reset for next time
                        translateYAnim.setValue(0);
                        bus.emit(GameEventType.TUTOR_EVENT, { type: 'ANIMATION_COMPLETE', payload: { command: payload.command } });
                    });
                }, 800);
            } else if (type === 'MISTAKE' && payload.type === 'SHADOW_BLOCK') {
                setIsCriticalError(true);
                Animated.sequence([
                    Animated.timing(shakeAnim, { toValue: 20, duration: 50, useNativeDriver }),
                    Animated.timing(shakeAnim, { toValue: -20, duration: 50, useNativeDriver }),
                    Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver })
                ]).start(() => {
                    setTimeout(() => setIsCriticalError(false), 500);
                });
            }
        });

        return () => {
            unsubTutor();
        };
    }, [bus, shakeAnim, scaleAnim, opacityAnim, translateYAnim, useNativeDriver]);

    if (!isAnimating) return null;

    return (
        <View style={styles.container} pointerEvents="none">
            <Animated.View 
                style={[
                    styles.rectangle, 
                    { 
                        borderColor: isCriticalError ? colors.error : colors.primary,
                        backgroundColor: 'rgba(0,0,0,0.95)',
                        transform: [{ translateX: shakeAnim }, { translateY: translateYAnim }, { scale: scaleAnim }],
                        opacity: opacityAnim
                    }
                ]}
            >
                <Text style={[styles.verbText, { color: isCriticalError ? colors.error : colors.primary }]}>
                    {activeVerb.toUpperCase()}
                </Text>
                <View style={[styles.scannerLine, { backgroundColor: isCriticalError ? colors.error : colors.primary }]} />
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 999,
    },
    rectangle: {
        width: '80%', // Match result card width
        minHeight: 150,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    verbText: {
        fontFamily: THEME.typography.fontFamily,
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 4,
    },
    scannerLine: {
        position: 'absolute',
        width: '100%',
        height: 2,
        opacity: 0.8,
    }
});