/**
 * App - Entry Point
 * 
 * Initializes the Terminalator application.
 */

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { TerminalScreen } from './src/presentation/screens/TerminalScreen';

import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, SpaceMono_400Regular, SpaceMono_700Bold } from '@expo-google-fonts/space-mono';

import { NavigationContainer } from '@react-navigation/native';
import { GameProvider } from './src/presentation/context/GameContext';
import { AppNavigator } from './src/presentation/navigation/AppNavigator';

export default function App() {
  const [fontsLoaded] = useFonts({
    SpaceMono_400Regular,
    SpaceMono_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <GameProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </GameProvider>
    </SafeAreaProvider>
  );
}
