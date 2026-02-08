/**
 * ThemeTypes.ts - UI Layer
 * 
 * Defines the contract for UI themes.
 * Extracted to break circular dependencies between Context and Registry.
 */

import { TextStyle, ViewStyle } from 'react-native';

export interface ThemeColors {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: {
        primary: string;
        secondary: string;
        dim: string;
    };
    error: string;
    success: string;
    warning: string;
    border: string;
}

export interface ThemeTypography {
    fontFamily: string;
    fontSize: {
        xs: number;
        sm: number;
        md: number;
        lg: number;
        xl: number;
    };
    lineHeight: {
        tight: number;
        normal: number;
        relaxed: number;
    };
}

export interface ThemeSpacing {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
}

export interface Theme {
    id: string;
    name: string;
    colors: ThemeColors;
    typography: ThemeTypography;
    spacing: ThemeSpacing;
}

export interface ThemeComponents {
    Layout: React.ComponentType<{ children: React.ReactNode }>;
    TextRenderer: React.ComponentType<{ content: string; style?: TextStyle }>;
    Cursor: React.ComponentType<{ color?: string }>;
}
