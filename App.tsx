/**
 * App - Entry Point
 * 
 * Initializes the Terminalator application.
 */

import React from 'react';
import { StatusBar } from 'expo-status-bar';
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
import { AppInitializer } from './src/frameworks-drivers/ui/components/AppInitializer';
import { useTutorMessagingController } from './src/frameworks-drivers/ui/hooks/useTutorMessagingController';

/**
 * AppContent - Component to safely use hooks that require GameProvider/ThemeProvider
 */
function AppContent() {
  useTutorMessagingController();
  
  return (
    <NavigationContainer>
      <AppNavigator />
    </NavigationContainer>
  );
}

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
            <AppContent />
          </InputProvider>
        </ThemeProvider>
      </GameProvider>
    </SafeAreaProvider>
  );
}