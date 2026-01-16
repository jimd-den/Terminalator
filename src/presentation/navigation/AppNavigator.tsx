/**
 * AppNavigator - Presentation Layer
 *
 * Manages the navigation stack for the application.
 * Currently supports a single screen (Terminal), but extensible for future UI.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture) - Frameworks/Drivers
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TerminalScreen } from '../screens/TerminalScreen';

const Stack = createNativeStackNavigator();

export const AppNavigator = () => {
    return (
        <Stack.Navigator
            initialRouteName="Terminal"
            screenOptions={{
                headerShown: false,
                animation: 'none', // Strict terminal feel, no flashy transitions
            }}
        >
            <Stack.Screen name="Terminal" component={TerminalScreen} />
        </Stack.Navigator>
    );
};
