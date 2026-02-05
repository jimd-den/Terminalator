/**
 * App - Entry Point
 * 
 * Initializes the Terminalator application.
 */

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { TerminalScreen } from './src/frameworks-drivers/ui/screens/TerminalScreen';

import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, SpaceMono_400Regular, SpaceMono_700Bold } from '@expo-google-fonts/space-mono';
import { RobotoMono_400Regular } from '@expo-google-fonts/roboto-mono';
import { Inconsolata_400Regular } from '@expo-google-fonts/inconsolata';
import { UbuntuMono_400Regular } from '@expo-google-fonts/ubuntu-mono';

import { NavigationContainer } from '@react-navigation/native';
import { GameProvider } from './src/frameworks-drivers/ui/context/GameContext';
import { ThemeProvider } from './src/frameworks-drivers/ui/context/ThemeContext';
import { InputProvider } from './src/frameworks-drivers/ui/context/InputContext';
import { AppNavigator } from './src/frameworks-drivers/ui/navigation/AppNavigator';
import { GlobalTutorBar } from './src/frameworks-drivers/ui/components/GlobalTutorBar';
import { AppInitializer } from './src/frameworks-drivers/ui/components/AppInitializer';
import { View, StyleSheet } from 'react-native';

export default function App() {
  const [fontsLoaded] = useFonts({
    SpaceMono_400Regular,
    SpaceMono_700Bold,
    RobotoMono_400Regular,
    Inconsolata_400Regular,
    UbuntuMono_400Regular,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <GameProvider>
        <ThemeProvider>
          <InputProvider>
            <AppInitializer />
            <NavigationContainer>
              <AppNavigator />
            </NavigationContainer>
          </InputProvider>
        </ThemeProvider>
      </GameProvider>
    </SafeAreaProvider>
  );
}
