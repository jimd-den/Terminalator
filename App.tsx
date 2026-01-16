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
import { RobotoMono_400Regular } from '@expo-google-fonts/roboto-mono';
import { Inconsolata_400Regular } from '@expo-google-fonts/inconsolata';
import { UbuntuMono_400Regular } from '@expo-google-fonts/ubuntu-mono';

import { NavigationContainer } from '@react-navigation/native';
import { GameProvider } from './src/presentation/context/GameContext';
import { ThemeProvider } from './src/presentation/context/ThemeContext';
import { AppNavigator } from './src/presentation/navigation/AppNavigator';

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
          <NavigationContainer>
            <AppNavigator />
          </NavigationContainer>
        </ThemeProvider>
      </GameProvider>
    </SafeAreaProvider>
  );
}
