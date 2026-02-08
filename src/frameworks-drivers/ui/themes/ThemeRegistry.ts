import { ThemeComponentMap } from '../../../domain/entities/ThemeComponents';
import { StandardLayout } from './standard/StandardLayout';
import { StandardTextRenderer } from './standard/StandardTextRenderer';
import { StandardCursor } from './standard/StandardCursor';

export const STANDARD_COMPONENTS: ThemeComponentMap = {
    Layout: StandardLayout as any,
    TextRenderer: StandardTextRenderer as any,
    Cursor: StandardCursor as any,
};

/**
 * ThemeRegistry - Framework Layer
 * 
 * Maps Theme IDs to their respective component implementations.
 * This keeps the Domain Layer (Theme entities) free of React dependencies.
 */
export const getComponentsForTheme = (themeId: string): ThemeComponentMap => {
    // For now, all themes use the Standard components.
    // In the future, 'alien' or 'cyberpunk' themes could return different maps.
    return STANDARD_COMPONENTS;
};
