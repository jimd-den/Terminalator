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
    onComplete?: () => void;
}

import { useTheme } from './context/ThemeContext';

export const GhostWriter: React.FC<GhostWriterProps> = ({
    text,
    speed = 30,
    style,
    onComplete
}) => {
    const { theme, settings } = useTheme();
    const colors = theme.colors;
    const [displayedText, setDisplayedText] = useState('');

    const dynamicStyles = StyleSheet.create({
        text: {
            color: colors.primary,
            fontFamily: settings.fontFamily,
            fontSize: THEME.typography.fontSize.md,
        },
        cursor: {
            color: colors.primary,
            opacity: 0.8,
        },
    });

    useEffect(() => {
        let currentIdx = 0;
        setDisplayedText(''); // Reset on new text

        const intervalId = setInterval(() => {
            if (currentIdx < text.length) {
                setDisplayedText(text.slice(0, currentIdx + 1));
                currentIdx++;
            } else {
                clearInterval(intervalId);
                onComplete?.();
            }
        }, speed);

        return () => clearInterval(intervalId);
    }, [text, speed, onComplete]);

    return (
        <Text style={[dynamicStyles.text, style]}>
            {displayedText}
            <Text style={dynamicStyles.cursor}>_</Text>
        </Text>
    );
};
