import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { TextRendererProps } from '../../../../domain/entities/ThemeComponents';
import { THEME } from '../../Theme';

/**
 * StandardTextRenderer - Default semantic text rendering.
 * 
 * Pillar: THE UNIVERSAL INTERFACE (Universal Typography)
 */
export const StandardTextRenderer: React.FC<TextRendererProps> = ({
    content,
    type = 'primary',
    style
}) => {
    const { theme, settings } = useTheme();
    const colors = theme.colors;

    const getTextColor = () => {
        switch (type) {
            case 'secondary': return colors.secondary;
            case 'dim': return colors.text.dim;
            case 'error': return colors.error;
            case 'success': return colors.primary;
            default: return colors.text.primary;
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
