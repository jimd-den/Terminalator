/**
 * Theme - Domain Layer Entity
 * 
 * Defines the structure of a terminal theme and provides preset definitions.
 * 
 * Pillar: THE STORYTELLER’S CODE (Literate Documentation)
 * Pillar: THE BALANCED SCALE (KISS)
 */

export interface ThemeColors {
    background: string;
    surface: string;
    primary: string;
    secondary: string;
    error: string;
    text: {
        primary: string;
        dim: string;
        inverted: string;
    };
    border: string;
    
    // Opacity Variants
    primary_05: string; // 5% opacity
    primary_10: string; // 10% opacity
    primary_20: string; // 20% opacity
    error_15: string;   // 15% opacity
    error_20: string;   // 20% opacity
    background_80: string; // 80% opacity overlay
    surface_50: string;    // 50% opacity surface
}

import { ThemeComponentMap } from './ThemeComponents';

export interface ThemeDefinition {
    id: string;
    name: string;
    colors: ThemeColors;
    components?: ThemeComponentMap;
}

export const THEMES: Record<string, ThemeDefinition> = {
    matrix: {
        id: 'matrix',
        name: 'Matrix (Default)',
        colors: {
            background: '#040404',
            surface: '#0A0A0A',
            primary: '#00FF41',
            secondary: '#D4AF37',
            error: '#FF0000',
            text: {
                primary: '#00FF41',
                dim: '#1B5E20',
                inverted: '#000000',
            },
            border: '#1B5E20',
            
            primary_05: '#00FF410D',
            primary_10: '#00FF411A',
            primary_20: '#00FF4133',
            error_15: '#FF000026',
            error_20: '#FF000033',
            background_80: '#040404CC',
            surface_50: '#0A0A0A80',
        }
    },
    amber: {
        id: 'amber',
        name: 'Amber CRT',
        colors: {
            background: '#120B00',
            surface: '#1E1200',
            primary: '#FFB000',
            secondary: '#FFCC00',
            error: '#FF4400',
            text: {
                primary: '#FFB000',
                dim: '#885500',
                inverted: '#000000',
            },
            border: '#885500',

            primary_05: '#FFB0000D',
            primary_10: '#FFB0001A',
            primary_20: '#FFB00033',
            error_15: '#FF440026',
            error_20: '#FF440033',
            background_80: '#120B00CC',
            surface_50: '#1E120080',
        }
    },
    nord: {
        id: 'nord',
        name: 'Nordic Frost',
        colors: {
            background: '#2E3440',
            surface: '#3B4252',
            primary: '#88C0D0',
            secondary: '#EBCB8B',
            error: '#BF616A',
            text: {
                primary: '#D8DEE9',
                dim: '#4C566A',
                inverted: '#2E3440',
            },
            border: '#4C566A',

            primary_05: '#88C0D00D',
            primary_10: '#88C0D01A',
            primary_20: '#88C0D033',
            error_15: '#BF616A26',
            error_20: '#BF616A33',
            background_80: '#2E3440CC',
            surface_50: '#3B425280',
        }
    },
    dracula: {
        id: 'dracula',
        name: 'Dracula',
        colors: {
            background: '#282A36',
            surface: '#44475A',
            primary: '#8BE9FD',
            secondary: '#BD93F9',
            error: '#FF5555',
            text: {
                primary: '#F8F8F2',
                dim: '#6272A4',
                inverted: '#282A36',
            },
            border: '#6272A4',

            primary_05: '#8BE9FD0D',
            primary_10: '#8BE9FD1A',
            primary_20: '#8BE9FD33',
            error_15: '#FF555526',
            error_20: '#FF555533',
            background_80: '#282A36CC',
            surface_50: '#44475A80',
        }
    }
};