import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { TextRendererProps } from '../../../../domain/entities/ThemeComponents';
import { THEME } from '../../Theme';

/**
 * StandardTextRenderer - Default semantic text rendering.
 * 
 * Refactored: Removed useTheme to break circular dependency.
 * Uses system fonts and global constants.
 */
export const StandardTextRenderer: React.FC<TextRendererProps> = ({
    content,
    type = 'primary',
    style
}) => {
    // Default fallback colors
    const colors = {
        primary: '#00FF41',
        secondary: '#00FF41',
        dim: '#003B00',
        error: '#FF0000',
        text: '#00FF41'
    };

    const getTextColor = () => {
        switch (type) {
            case 'secondary': return colors.secondary;
            case 'dim': return colors.dim;
            case 'error': return colors.error;
            case 'success': return colors.primary;
            default: return colors.text;
        }
    };

    const textStyle = {
        color: getTextColor(),
        fontFamily: THEME.typography.fontFamily,
        fontSize: THEME.typography.fontSize.md,
    };

    return (
        <Text style={[textStyle, style]}>
            {content}
        </Text>
    );
};