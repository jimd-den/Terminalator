import { UserSettings, DEFAULT_SETTINGS } from '../src/domain/entities/Settings';

function testSettingsHasForceKeyboard() {
    console.log("Testing UserSettings for forceKeyboardOpen...");
    
    // This should now compile and pass
    const settings: UserSettings = DEFAULT_SETTINGS;
    const value: boolean = settings.forceKeyboardOpen;
    
    if (value !== false) {
        throw new Error(`Expected default forceKeyboardOpen to be false, got ${value}`);
    }

    console.log("PASS");
}

testSettingsHasForceKeyboard();
