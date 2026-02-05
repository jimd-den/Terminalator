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
        }
    }
};
