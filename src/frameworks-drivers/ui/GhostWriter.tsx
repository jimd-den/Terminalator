/**
 * GhostWriter Component - Frameworks/Drivers Layer
 * 
 * Implements the "ghost typed" environment.
 * Progressively renders text to simulate a terminal's typing effect.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';
import { THEME } from './Theme';

interface GhostWriterProps {
    text: string;
    speed?: number;
    style?: TextStyle;
    isActive?: boolean;
    onComplete?: () => void;
}

import { useTheme } from './context/ThemeContext';

export const GhostWriter: React.FC<GhostWriterProps> = ({
    text,
    speed = 30,
    style,
    isActive = true, // Default to true if not controlled
    onComplete
}) => {
    const { theme, settings } = useTheme();
    const colors = theme.colors;
    const [displayedText, setDisplayedText] = useState('');
    const [isComplete, setIsComplete] = useState(false);
    const hasStartedRef = useRef(false);

    const dynamicStyles = StyleSheet.create({
        text: {
            color: colors.primary,
            fontFamily: settings.fontFamily,
            fontSize: THEME.typography.fontSize.md,
        },
        cursor: {
            color: colors.primary,
            backgroundColor: colors.primary, // Block cursor
            opacity: 0.9,
            width: 10,
            height: 16,
        },
    });

    useEffect(() => {
        if (!isActive) return;

        // If we were already complete (e.g. re-render), don't restart
        if (isComplete) return;

        let currentIdx = displayedText.length;
        let timeoutId: NodeJS.Timeout;
        let isMounted = true;

        if (!hasStartedRef.current) {
            setDisplayedText('');
            hasStartedRef.current = true;
            currentIdx = 0;
        }

        const typeNextChar = () => {
            if (!isMounted) return;

            if (currentIdx < text.length) {
                setDisplayedText(text.slice(0, currentIdx + 1));
                currentIdx++;

                // Respect the speed prop for authentic terminal materialization
                timeoutId = setTimeout(typeNextChar, speed);
            } else {
                setIsComplete(true);
                onComplete?.();
            }
        };

        // Initial delay before starting to type
        timeoutId = setTimeout(typeNextChar, 10);

        return () => {
            isMounted = false;
            clearTimeout(timeoutId);
        };
    }, [text, speed, isActive, isComplete, onComplete, displayedText.length]);

    // If not active yet, show nothing
    if (!isActive && !hasStartedRef.current) return null;

    return (
        <Text style={[dynamicStyles.text, style]}>
            {displayedText}
            {/* Removed the sliding block cursor as requested for a cleaner 'materializing' look */}
        </Text>
    );
};
