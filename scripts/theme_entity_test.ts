import { THEMES, ThemeColors } from '../src/domain/entities/Theme';

function testThemeColorsExpansion() {
    console.log("Testing ThemeColors expansion...");
    
    const matrixColors = THEMES.matrix.colors as any; // Cast to any to perform runtime check before interface update
    
    const requiredKeys = [
        'primary_05', 
        'primary_10', 
        'primary_20', 
        'error_15', 
        'error_20', 
        'background_80', 
        'surface_50'
    ];

    const missingKeys = requiredKeys.filter(key => matrixColors[key] === undefined);

    if (missingKeys.length > 0) {
        throw new Error(`Missing required keys in Matrix theme: ${missingKeys.join(', ')}`);
    }

    console.log("PASS");
}

try {
    testThemeColorsExpansion();
} catch (e: any) {
    console.error(`
TEST FAILED: ${e.message}`);
    process.exit(1);
}
