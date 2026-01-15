/**
 * Theme - Frameworks/Drivers Layer
 * 
 * Defines the design system for the "Terminalator" fantasy computer.
 * Adheres to "Large Format" and high-contrast principles.
 * 
 * Palette: "Dystopian Corporate" (Monochrome greens/ambers, high black ratio)
 */

export const THEME = {
    colors: {
        background: '#040404',
        surface: '#0A0A0A',
        primary: '#00FF41', // Matrix/Aliens green
        secondary: '#D4AF37', // "Corporate Gold"
        error: '#FF0000',
        text: {
            primary: '#00FF41',
            dim: '#1B5E20',
            inverted: '#000000',
        },
        border: '#1B5E20',
    },
    typography: {
        // Large Format for mobile accessibility
        fontSize: {
            xl: 32,
            lg: 24,
            md: 18,
            sm: 14,
        },
        fontFamily: 'SpaceMono_400Regular', // Standard terminal look (Space Themed)
        lineHeight: 1.4,
    },
    spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
    },
    borders: {
        width: 2,
        radius: 4,
    }
};
