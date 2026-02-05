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
    style?: any;
    children?: React.ReactNode;
}

export interface TextRendererProps {
    content: string;
    type?: 'primary' | 'secondary' | 'dim' | 'error' | 'success';
    style?: any;
}

export interface CursorProps {
    active: boolean;
    color: string;
    type?: 'block' | 'line' | 'underline';
    metadata?: Record<string, any>;
}

export interface ThemeComponentMap {
    Layout: React.ComponentType<LayoutProps>;
    TextRenderer: React.ComponentType<TextRendererProps>;
    Cursor: React.ComponentType<CursorProps>;
}
