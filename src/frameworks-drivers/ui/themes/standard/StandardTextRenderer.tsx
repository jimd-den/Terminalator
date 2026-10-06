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
    style,
    theme,
    settings
}) => {
    // Default fallback colors
    const colors = {
        primary: theme.colors.primary,
        secondary: theme.colors.secondary,
        dim: theme.colors.text.dim,
        error: theme.colors.error,
        text: theme.colors.text.primary
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
        fontFamily: settings.fontFamily,
        fontSize: THEME.typography.fontSize.md,
    };

    return (
        <Text style={[textStyle, style]}>
            {content}
        </Text>
    );
};