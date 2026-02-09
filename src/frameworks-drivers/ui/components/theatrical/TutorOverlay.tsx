import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { useProcess } from '../../context/ProcessProvider';
import { useTutorPersona } from '../../context/TutorPersonaProvider';
import { GameEventType } from '../../../../domain/services/SimulationBus';
import { THEME } from '../../Theme';
import { useTheme } from '../../context/ThemeContext';

/**
 * TutorOverlay - Presentation Layer Component
 * 
 * Provides rhythm-synced visual guidance for the Tutor minigame.
 * Pulses on RHYTHM_TICK to communicate the beat and typing direction.
 * 
 * Pillar: THE STORYTELLER'S CODE (Visual Rhythm)
 * Pillar: THE HUMBLE OBJECT (Decoupled Feedback)
 */
export const TutorOverlay: React.FC = () => {
    const { bus, gameManager } = useProcess();
    const { theme } = useTheme();
    const colors = theme.colors;
    
    const [isActive, setIsActive] = useState(false);
    const [nextChar, setNextChar] = useState<string | null>(null);
    
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const useNativeDriver = Platform.OS !== 'web';

    useEffect(() => {
        const unsubTutor = bus.subscribe(GameEventType.TUTOR_EVENT, (event) => {
            const { type, payload } = event.payload;
            
            if (type === 'START') {
                setIsActive(true);
            } else if (type === 'COMPLETE' || type === 'STOP') {
                setIsActive(false);
                setNextChar(null);
            } else if (type === 'RHYTHM_TICK' && isActive) {
                // Pulse on every tick
                pulse();
                
                // Update next char from engine
                const lesson = gameManager.tutorEngine.getCurrentLesson();
                if (lesson) {
                    const completed = gameManager.tutorEngine.getCompletedText();
                    setNextChar(lesson.text[completed.length] || null);
                }
            }
        });

        return () => unsubTutor();
    }, [bus, isActive, gameManager]);

    const pulse = () => {
        pulseAnim.setValue(1.5);
        Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver
        }).start();
    };

    if (!isActive || !nextChar) return null;

    return (
        <View style={styles.container} pointerEvents="none">
            <Animated.View style={[styles.pulseCircle, { 
                borderColor: colors.secondary,
                transform: [{ scale: pulseAnim }],
                opacity: pulseAnim.interpolate({ inputRange: [1, 1.5], outputRange: [0.3, 0.8] })
            }]} />
            <Text style={[styles.directionText, { color: colors.secondary }]}>
                {nextChar === ' ' ? 'SPACE' : nextChar.toUpperCase()}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: '40%',
        alignSelf: 'center',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
    },
    pulseCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 4,
        position: 'absolute',
    },
    directionText: {
        fontFamily: THEME.typography.fontFamily,
        fontSize: 32,
        fontWeight: '900',
        letterSpacing: 2,
    }
});
