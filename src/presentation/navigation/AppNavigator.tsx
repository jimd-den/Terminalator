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
                animation: 'none',
            }}
        >
            <Stack.Screen name="Terminal" component={TerminalScreen} />
        </Stack.Navigator>
    );
};
