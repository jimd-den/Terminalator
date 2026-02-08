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
import { FileSystemProvider } from './src/frameworks-drivers/ui/context/FileSystemProvider';
import { EconomyProvider } from './src/frameworks-drivers/ui/context/EconomyProvider';
import { TutorMessagingProvider } from './src/frameworks-drivers/ui/context/TutorMessagingProvider';
import { MasteryProvider } from './src/frameworks-drivers/ui/context/MasteryProvider';
import { SystemStateProvider } from './src/frameworks-drivers/ui/context/SystemStateProvider';
import { ProcessProvider } from './src/frameworks-drivers/ui/context/ProcessProvider';
import { TutorPersonaProvider } from './src/frameworks-drivers/ui/context/TutorPersonaProvider';
import { ThemeProvider } from './src/frameworks-drivers/ui/context/ThemeContext';
import { InputProvider } from './src/frameworks-drivers/ui/context/InputContext';
import { AppNavigator } from './src/frameworks-drivers/ui/navigation/AppNavigator';
import { AppInitializer } from './src/frameworks-drivers/ui/components/AppInitializer';
import { useTutorMessagingController } from './src/frameworks-drivers/ui/hooks/useTutorMessagingController';
import { useTheatricalInputLock } from './src/frameworks-drivers/ui/hooks/useTheatricalInputLock';
import { CoreEngine } from './src/core/CoreEngine';

// Initialize CoreEngine outside the React tree
CoreEngine.getInstance().initialize();

/**
 * AppContent - Component to safely use hooks that require GameProvider/ThemeProvider
 */
function AppContent() {
  useTutorMessagingController();
  useTheatricalInputLock();
  
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
      <FileSystemProvider>
        <EconomyProvider>
          <TutorMessagingProvider>
            <MasteryProvider>
              <SystemStateProvider>
                <ProcessProvider>
                  <TutorPersonaProvider>
                    <ThemeProvider>
                      <InputProvider>
                        <AppInitializer />
                        <AppContent />
                      </InputProvider>
                    </ThemeProvider>
                  </TutorPersonaProvider>
                </ProcessProvider>
              </SystemStateProvider>
            </MasteryProvider>
          </TutorMessagingProvider>
        </EconomyProvider>
      </FileSystemProvider>
    </SafeAreaProvider>
  );
}