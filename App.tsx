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
      <TerminalScreen />
    </SafeAreaProvider>
  );
}
