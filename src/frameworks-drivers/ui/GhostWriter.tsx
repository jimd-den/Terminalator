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

export const GhostWriter: React.FC<GhostWriterProps> = ({
    text,
    speed = 30,
    style,
    onComplete
}) => {
    const [displayedText, setDisplayedText] = useState('');

    useEffect(() => {
        let currentIdx = 0;
        setDisplayedText(''); // Reset on new text

        const intervalId = setInterval(() => {
            if (currentIdx < text.length) {
                // Use slice guarantees we never append 'undefined' and always show valid prefix
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
        <Text style={[styles.text, style]}>
            {displayedText}
            <Text style={styles.cursor}>_</Text>
        </Text>
    );
};

const styles = StyleSheet.create({
    text: {
        color: THEME.colors.primary,
        fontFamily: THEME.typography.fontFamily,
        fontSize: THEME.typography.fontSize.md,
    },
    cursor: {
        color: THEME.colors.primary,
        opacity: 0.8,
    },
});
