import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TerminalScreen } from '../screens/TerminalScreen';
import { EditorScreen } from '../screens/EditorScreen';

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
            <Stack.Screen name="Editor" component={EditorScreen} />
        </Stack.Navigator>
    );
};
