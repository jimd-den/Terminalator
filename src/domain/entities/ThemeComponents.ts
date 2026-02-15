/**
 * ThemeComponents - Domain Entities
 *
 * Defines the contract for UI components provided by a Theme.
 * Part of the "Universal Interface" strategy.
 *
 * Pillar: THE FOUR-FOLD SHIELD (Strict Architecture)
 */

import React from 'react';

export interface LayoutProps {
    status?: string;
    headerComponent?: React.ReactNode;
    topContent: React.ReactNode;
    middleContent?: React.ReactNode;
    bottomContent: React.ReactNode;
    sideContent?: React.ReactNode;
    tutorBarComponent?: React.ReactNode;
    economyBarComponent?: React.ReactNode;
    style?: any;
    children?: React.ReactNode;
    theme?: any;
    settings?: any;
}

export interface TextRendererProps {
    content: string;
    type?: 'primary' | 'secondary' | 'dim' | 'error' | 'success';
    style?: any;
    theme?: any;
    settings?: any;
}

export interface CursorProps {
    active: boolean;
    color: string;
    type?: 'block' | 'line' | 'underline';
    metadata?: Record<string, any>;
    theme?: any;
    settings?: any;
}

export interface ThemeComponentMap {
    Layout: React.ComponentType<LayoutProps>;
    TextRenderer: React.ComponentType<TextRendererProps>;
    Cursor: React.ComponentType<CursorProps>;
}
