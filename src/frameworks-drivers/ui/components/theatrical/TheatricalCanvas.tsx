import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Animated, Platform } from 'react-native';
import { useProcess } from '../../context/ProcessProvider';
import { GameEventType } from '../../../../domain/services/SimulationBus';

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
    
    // --- Animation State ---
    const [isCriticalError, setIsCriticalError] = useState(false);
    
    const shakeAnim = useRef(new Animated.Value(0)).current;
    const useNativeDriver = Platform.OS !== 'web';

    useEffect(() => {
        const unsubTutor = bus.subscribe(GameEventType.TUTOR_EVENT, (event) => {
            const tutorEvent = event.payload;
            const { type, payload } = tutorEvent;
            const typeStr = type as string;
            
            if (typeStr === 'MISTAKE' && payload.type === 'SHADOW_BLOCK') {
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
    }, [bus, shakeAnim, useNativeDriver]);

    // If we had Canvas/WebGL logic, it would live here, 
    // driven by start/end events.

    return (
        <Animated.View 
            pointerEvents="none"
            style={[
                styles.overlay, 
                { 
                    backgroundColor: isCriticalError ? 'rgba(255,0,0,0.3)' : 'transparent',
                    transform: [{ translateX: shakeAnim }] 
                }
            ]}
        />
    );
};

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 999,
    }
});
